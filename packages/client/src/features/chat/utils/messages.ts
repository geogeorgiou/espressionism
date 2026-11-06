import type {
  ChatTurn,
  RobospressoMessage,
} from '@espressionism/agent/contract'
import {
  CHAT_ENDPOINT,
  showMachinesOutputSchema,
} from '@espressionism/agent/contract'
import { DefaultChatTransport } from 'ai'
import type { ChatTransport } from 'ai'

export type { RobospressoMessage }
export type ChatRole = ChatTurn['role']
export type RobospressoTransport = ChatTransport<RobospressoMessage>

export const GREETING_ID = 'greeting'

/** Longest turn the agent accepts (`chatTurnSchema`). */
const MAX_TURN_LENGTH = 2000

/**
 * The real transport: `POST /api/chat` with text turns only (see
 * `@espressionism/agent`), answered by a UI message stream.
 */
export function createChatTransport(): RobospressoTransport {
  return new DefaultChatTransport<RobospressoMessage>({
    api: CHAT_ENDPOINT,
    prepareSendMessagesRequest: ({ messages }) => ({
      body: { messages: toTurns(messages) },
    }),
  })
}

/** Every text part of a message, joined. */
export function messageText(message: RobospressoMessage): string {
  return message.parts
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join('')
    .trim()
}

/** Slugs of the machines a message drew as cards. */
function shownSlugs(message: RobospressoMessage): string[] {
  return message.parts.flatMap((part) => {
    if (part.type !== 'tool-show_machines' || part.state !== 'output-available')
      return []
    const output = showMachinesOutputSchema.safeParse(part.output)
    return output.success && output.data.ok
      ? output.data.items.map((m) => m.slug)
      : []
  })
}

/**
 * The turns the agent reads: everything said so far, minus the greeting
 * (UI chrome, not part of the conversation). Tool parts stay in the browser;
 * an assistant turn only notes which cards it showed, so "the second one"
 * still means something on the next question.
 */
export function toTurns(messages: RobospressoMessage[]): ChatTurn[] {
  return messages.flatMap((message): ChatTurn[] => {
    if (message.id === GREETING_ID || message.role === 'system') return []
    const slugs = message.role === 'assistant' ? shownSlugs(message) : []
    const text = [
      messageText(message),
      slugs.length > 0 ? `[Cards shown: ${slugs.join(', ')}]` : '',
    ]
      .filter(Boolean)
      .join('\n')
      .slice(0, MAX_TURN_LENGTH)
    return text ? [{ role: message.role, text }] : []
  })
}
