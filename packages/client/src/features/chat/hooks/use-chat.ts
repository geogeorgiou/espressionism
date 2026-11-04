import { useCallback, useEffect, useRef, useState } from 'react'

import { CHAT_GREETING, STUB_REPLY_DELAY_MS } from '../constants'
import type { ChatMessage } from '../utils/messages'
import { stubReply } from '../utils/messages'

interface UseChatOptions {
  /** Delay before the stub answers; tests pass 0. */
  replyDelayMs?: number
}

export interface ChatState {
  messages: ChatMessage[]
  /** True while a reply is on its way. */
  pending: boolean
  send: (text: string) => void
}

const GREETING: ChatMessage = {
  id: 'greeting',
  role: 'assistant',
  text: CHAT_GREETING,
}

/**
 * Conversation state with a local stub reply. The same shape (`messages`,
 * `pending`, `send`) will be backed by the AI SDK once the server route lands.
 */
export function useChat({
  replyDelayMs = STUB_REPLY_DELAY_MS,
}: UseChatOptions = {}): ChatState {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING])
  const [pending, setPending] = useState(false)
  const nextId = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const send = useCallback(
    (text: string) => {
      const question = text.trim()
      if (!question) return
      setMessages((prev) => [
        ...prev,
        { id: `user-${nextId.current++}`, role: 'user', text: question },
      ])
      setPending(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        setMessages((prev) => [
          ...prev,
          {
            id: `assistant-${nextId.current++}`,
            role: 'assistant',
            text: stubReply(),
          },
        ])
        setPending(false)
      }, replyDelayMs)
    },
    [replyDelayMs],
  )

  return { messages, pending, send }
}
