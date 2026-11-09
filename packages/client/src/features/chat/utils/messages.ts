import type {
  ChatRequest,
  RobospressoMessage,
} from '@espressionism/agent/contract'
import { CHAT_ENDPOINT } from '@espressionism/agent/contract'
import type { CalculatorValues } from '@espressionism/calculator'
import { DefaultChatTransport } from 'ai'
import type { ChatTransport } from 'ai'

export type { RobospressoMessage }
export type RobospressoTransport = ChatTransport<RobospressoMessage>

export const GREETING_ID = 'greeting'

/** What `useChat` passes along with each question (`sendMessage`'s body). */
export interface SendBody {
  /** The session to continue; left out for a new conversation. */
  sessionId?: string
  /** The calculator as the page shows it (valid values only). */
  calculator?: CalculatorValues
}

/**
 * The real transport: `POST /api/chat` with the new question, its session
 * and the calculator's values. The agent holds the conversation itself (see
 * `@espressionism/agent`) and answers with a UI message stream.
 */
export function createChatTransport(): RobospressoTransport {
  return new DefaultChatTransport<RobospressoMessage>({
    api: CHAT_ENDPOINT,
    prepareSendMessagesRequest: ({ messages, body }) => ({
      body: chatRequest(messages, body),
    }),
  })
}

/** The request body for the newest question. */
export function chatRequest(
  messages: RobospressoMessage[],
  body: object | undefined,
): ChatRequest {
  const { sessionId, calculator } = (body ?? {}) as SendBody
  const last = messages.at(-1)
  return {
    ...(sessionId ? { sessionId } : {}),
    text: last ? messageText(last) : '',
    ...(calculator ? { calculator } : {}),
  }
}

/** Every text part of a message, joined. */
export function messageText(message: RobospressoMessage): string {
  return message.parts
    .map((part) => (part.type === 'text' ? part.text : ''))
    .join('')
    .trim()
}
