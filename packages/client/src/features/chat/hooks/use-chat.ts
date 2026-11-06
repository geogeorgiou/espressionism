import { useChat as useAiChat } from '@ai-sdk/react'
import { useCallback, useState } from 'react'

import { CHAT_GREETING } from '../constants'
import type {
  RobospressoMessage,
  RobospressoTransport,
} from '../utils/messages'
import { GREETING_ID, createChatTransport } from '../utils/messages'
import { isSearching } from '../utils/parts'

interface UseChatOptions {
  /** How questions reach the agent; tests pass a fake. */
  transport?: RobospressoTransport
}

export interface ChatState {
  messages: RobospressoMessage[]
  /** True from sending a question until its answer has finished. */
  busy: boolean
  /** True while there's nothing new to show yet (the store search). */
  searching: boolean
  /** True when the last answer failed; its partial parts stay in `messages`. */
  failed: boolean
  send: (text: string) => void
}

const GREETING: RobospressoMessage = {
  id: GREETING_ID,
  role: 'assistant',
  parts: [{ type: 'text', text: CHAT_GREETING }],
}

/**
 * Conversation state over the AI SDK's chat, streaming from `POST /api/chat`.
 * One question at a time: a new one waits until the last answer has
 * finished (the composer is disabled).
 */
export function useChat({ transport }: UseChatOptions = {}): ChatState {
  // Created once: the AI SDK keeps one chat per hook instance.
  const [chatTransport] = useState(() => transport ?? createChatTransport())
  const { messages, status, sendMessage } = useAiChat<RobospressoMessage>({
    transport: chatTransport,
    messages: [GREETING],
  })
  const busy = status === 'submitted' || status === 'streaming'

  const send = useCallback(
    (text: string) => {
      const question = text.trim()
      if (!question || busy) return
      void sendMessage({ text: question })
    },
    [busy, sendMessage],
  )

  return {
    messages,
    busy,
    searching: isSearching(messages, status),
    failed: status === 'error',
    send,
  }
}
