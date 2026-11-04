import type { ChatTurn } from '@espressionism/agent/contract'
import { CHAT_ENDPOINT, chatReplySchema } from '@espressionism/agent/contract'

export type ChatRole = ChatTurn['role']

export interface ChatMessage {
  id: string
  role: ChatRole
  text: string
  /** True for the fallback shown when the agent couldn't answer. */
  failed?: boolean
}

/** Sends the conversation and resolves with Robospresso's answer. */
export type ChatTransport = (
  messages: ChatTurn[],
  signal: AbortSignal,
) => Promise<string>

/** The real transport: `POST /api/chat` (see `@espressionism/agent`). */
export const fetchReply: ChatTransport = async (messages, signal) => {
  const response = await fetch(CHAT_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages }),
    signal,
  })
  if (!response.ok) throw new Error(`Chat request failed (${response.status})`)
  return chatReplySchema.parse(await response.json()).message.text
}

/**
 * The turns the agent reads: everything said so far, minus the greeting and
 * any failed fallback (UI chrome, not part of the conversation).
 */
export function toTurns(messages: ChatMessage[]): ChatTurn[] {
  return messages
    .filter((m) => m.id !== GREETING_ID && !m.failed)
    .map(({ role, text }) => ({ role, text }))
}

export const GREETING_ID = 'greeting'
