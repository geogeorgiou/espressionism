import { createUIMessageStream, isStepCount, streamText } from 'ai'
import type { LanguageModel } from 'ai'

import type { ChatTurn } from './contract'
import { DISPLAY_TOOLS } from './contract'
import type { ReplyFn } from './handler'
import { EMPTY_REPLY, INSTRUCTIONS } from './instructions'
import { GENERIC_ERROR, logError, writeText } from './stream'
import { STORE_TOOLS } from './tools'

/**
 * A model object, never a bare `'creator/model'` string: the AI SDK routes
 * strings through Vercel's AI Gateway (its default global provider), and
 * Robospresso calls its provider directly.
 */
export type StoreModel = Exclude<LanguageModel, string>

export interface StoreReplyLimits {
  /** Model calls per question, tool round-trips included. */
  maxSteps: number
  /** Longest answer per model call. */
  maxOutputTokens: number
  /** Wall time for the whole answer, in milliseconds. */
  timeoutMs: number
}

export const DEFAULT_LIMITS: StoreReplyLimits = {
  // search → display tools → text, with one spare for a corrected call.
  maxSteps: 4,
  maxOutputTokens: 400,
  timeoutMs: 20_000,
}

export interface StoreReplyConfig {
  model: StoreModel
  limits?: Partial<StoreReplyLimits>
}

const DISPLAY_TOOL_NAMES = new Set<string>(Object.values(DISPLAY_TOOLS))

/**
 * Robospresso's brain: the model answers with the store search and the
 * display tools, under fixed limits, streamed as UI message chunks. The
 * caller picks the model, so this never sees a key.
 */
export function createStoreReply({ model, limits }: StoreReplyConfig): ReplyFn {
  const { maxSteps, maxOutputTokens, timeoutMs } = {
    ...DEFAULT_LIMITS,
    ...limits,
  }
  return (turns, { signal } = {}) =>
    createUIMessageStream({
      onError: (error) => {
        logError(error)
        return GENERIC_ERROR
      },
      execute: async ({ writer }) => {
        const result = streamText({
          model,
          instructions: INSTRUCTIONS,
          messages: turns.map(toModelMessage),
          tools: STORE_TOOLS,
          stopWhen: isStepCount(maxSteps),
          maxOutputTokens,
          timeout: { totalMs: timeoutMs },
          maxRetries: 1,
          abortSignal: signal,
        })

        // Pass every chunk through, noting whether the visitor got anything
        // to look at, so an answer never ends blank.
        let answered = false
        let failed = false
        const ids = new Map<string, string>()
        for await (const chunk of result.toUIMessageStream({
          sendFinish: false,
          onError: (error) => {
            logError(error)
            return GENERIC_ERROR
          },
        })) {
          switch (chunk.type) {
            case 'text-delta':
              if (chunk.delta.trim()) answered = true
              break
            case 'tool-input-start':
            case 'tool-input-available':
              ids.set(chunk.toolCallId, chunk.toolName)
              break
            case 'tool-output-available':
              if (DISPLAY_TOOL_NAMES.has(ids.get(chunk.toolCallId) ?? '')) {
                answered = true
              }
              break
            case 'error':
              failed = true
              break
            case 'abort':
              failed = true
              writer.write({ type: 'error', errorText: GENERIC_ERROR })
              continue
          }
          writer.write(chunk)
        }
        if (!answered && !failed) writeText(writer, EMPTY_REPLY, 'empty')
        writer.write({ type: 'finish' })
      },
    })
}

function toModelMessage({ role, text }: ChatTurn) {
  return { role, content: text }
}
