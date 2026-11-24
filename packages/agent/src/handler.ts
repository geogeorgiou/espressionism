import type { CalculatorValues } from '@espressionism/calculator'
import { createUIMessageStream, createUIMessageStreamResponse } from 'ai'
import type { UIMessage } from 'ai'

import type {
  CalculatorFill,
  ChatError,
  ChatTurn,
  SessionData,
} from './contract'
import {
  MAX_BODY_BYTES,
  chatRequestSchema,
  chatTurnSchema,
  readDisplayPart,
} from './contract'
import type { ConversationStore } from './memory'
import { createInMemoryStore, selectWindow } from './memory'
import { stubReply } from './persona'
import type { ReplyStream } from './stream'
import { GENERIC_ERROR, logError } from './stream'

export interface ReplyOptions {
  /** Aborts the answer when the visitor leaves or stops it. */
  signal?: AbortSignal
  /** The calculator's values as the page shows them, if it sent them. */
  calculator?: CalculatorValues
}

/** Streams Robospresso's next message from the window of the session. */
export type ReplyFn = (
  messages: ChatTurn[],
  options?: ReplyOptions,
) => ReplyStream

export interface AgentConfig {
  /** Swappable brain; defaults to the placeholder reply. */
  reply?: ReplyFn
  /** Where sessions live; defaults to this instance's memory. */
  store?: ConversationStore
}

/** Longest turn a session keeps (`chatTurnSchema`). */
const MAX_TURN_LENGTH = 2000

export type ChatHandler = (request: Request) => Promise<Response>

/**
 * The whole agent behind one Web-standard function. Hosts adapt to it in a
 * few lines: the Vercel Function (`api/chat.ts`) and the Vite dev plugin.
 * Create it once per process, not per request.
 *
 * The handler owns the conversation: the client sends one question and its
 * session id, and the handler records both the question and, once it
 * completes, the answer. An unknown or expired id starts a restarted
 * session; a session that is still answering refuses a second question.
 *
 * A valid question gets an AI SDK UI message stream (server-sent events)
 * that opens with a transient `data-session` part. Errors before the stream
 * starts are JSON (`{ error }`); errors during it arrive as a generic error
 * chunk. Either way the reason only reaches the server log.
 */
export function createChatHandler({
  reply = stubReply,
  store = createInMemoryStore(),
}: AgentConfig = {}): ChatHandler {
  /** Sessions with an answer still streaming. */
  const answering = new Set<string>()

  return async (request) => {
    if (request.method !== 'POST') {
      return json({ error: 'Method not allowed' }, 405, {
        Allow: 'POST',
      })
    }
    if (Number(request.headers.get('content-length') ?? 0) > MAX_BODY_BYTES) {
      return json({ error: 'Request too large' }, 413)
    }

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return json({ error: 'Body must be JSON' }, 400)
    }
    // One question, nothing else: history lives on the server, so a client
    // can't forge earlier turns (or tool outputs) for the model to trust.
    const parsed = chatRequestSchema.safeParse(body)
    if (!parsed.success) {
      return json({ error: 'Invalid chat request' }, 400)
    }
    const { sessionId, text, calculator } = parsed.data

    const session = openSession(store, sessionId)
    if (answering.has(session.id)) {
      return json({ error: 'Still answering the last question' }, 409)
    }
    store.append(session.id, [{ role: 'user', text }])
    const window = selectWindow(store.get(session.id) ?? [])

    answering.add(session.id)
    try {
      const answer = reply(window, { signal: request.signal, calculator })
      const stream = createUIMessageStream({
        execute: async ({ writer }) => {
          writer.write({ type: 'data-session', data: session, transient: true })
          // Replies report failure in-band, so watch for it and declare the
          // outcome: only a completed answer is remembered.
          let failed = false
          for await (const chunk of answer) {
            if (chunk.type === 'error' || chunk.type === 'abort') failed = true
            writer.write(chunk)
          }
          writer.setOutcome({ status: failed ? 'failed' : 'completed' })
        },
        onEnd: ({ outcome, responseMessage }) => {
          answering.delete(session.id)
          if (outcome.status !== 'completed') return
          const turn = assistantTurn(responseMessage)
          if (turn) store.append(session.id, [turn])
        },
      })
      return createUIMessageStreamResponse({
        stream,
        headers: { 'Cache-Control': 'no-store' },
      })
    } catch (error) {
      answering.delete(session.id)
      logError(error)
      return json({ error: GENERIC_ERROR }, 500)
    }
  }
}

/** The session the client asked for, or a new one if it was lost. */
function openSession(
  store: ConversationStore,
  sessionId: string | undefined,
): SessionData {
  if (sessionId && store.get(sessionId)) {
    return { id: sessionId, restarted: false }
  }
  if (sessionId) console.info('chat: session restarted')
  return { id: store.create(), restarted: Boolean(sessionId) }
}

/**
 * What Robospresso said, as a turn: its text plus notes of what its display
 * tools did (the cards it showed, the calculator it filled), so "the second
 * one" or "and with 3 cups?" still means something next time.
 */
function assistantTurn(message: UIMessage): ChatTurn | undefined {
  const said = message.parts
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join('')
    .trim()
  const slugs: string[] = []
  const fills: string[] = []
  for (const part of message.parts) {
    const display = readDisplayPart(part)
    if (display?.tool === 'show_machines' && display.state === 'done') {
      slugs.push(...display.machines.map((machine) => machine.slug))
    }
    if (display?.tool === 'fill_calculator') {
      fills.push(calculatorNote(display.fill))
    }
  }
  const text = [
    said,
    slugs.length > 0 ? `[Cards shown: ${slugs.join(', ')}]` : '',
    ...fills,
  ]
    .filter(Boolean)
    .join('\n')
  const turn = chatTurnSchema.safeParse({
    role: 'assistant',
    text: text.slice(0, MAX_TURN_LENGTH),
  })
  return turn.success ? turn.data : undefined
}

/**
 * `[Calculator filled: cupsPerDay=2 → fast. The machine pays for itself in
 * 4 months and leaves €1,234 in your pocket over 3 years.]`
 */
function calculatorNote({ changes, verdict, message }: CalculatorFill): string {
  const fields = Object.entries(changes)
    .map(([field, value]) => `${field}=${String(value)}`)
    .join(', ')
  return `[Calculator filled: ${fields || 'no changes'} → ${verdict}. ${message}]`
}

function json(
  data: ChatError,
  status: number,
  headers: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...headers,
    },
  })
}
