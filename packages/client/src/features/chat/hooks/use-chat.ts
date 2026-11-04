import { useCallback, useEffect, useRef, useState } from 'react'

import { CHAT_ERROR_REPLY, CHAT_GREETING } from '../constants'
import type { ChatMessage, ChatTransport } from '../utils/messages'
import { GREETING_ID, fetchReply, toTurns } from '../utils/messages'

interface UseChatOptions {
  /** How questions reach the agent; tests pass a fake. */
  transport?: ChatTransport
}

export interface ChatState {
  messages: ChatMessage[]
  /** True while a reply is on its way. */
  pending: boolean
  send: (text: string) => void
}

const GREETING: ChatMessage = {
  id: GREETING_ID,
  role: 'assistant',
  text: CHAT_GREETING,
}

/**
 * Conversation state backed by `POST /api/chat`. One question at a time: a
 * new one waits until the last answer arrives (the composer is disabled).
 */
export function useChat({
  transport = fetchReply,
}: UseChatOptions = {}): ChatState {
  const [messages, setMessages] = useState<ChatMessage[]>([GREETING])
  const [pending, setPending] = useState(false)
  // The conversation as last rendered, read by `send` without re-creating it.
  const latest = useRef(messages)
  useEffect(() => {
    latest.current = messages
  }, [messages])
  const inFlight = useRef<AbortController | null>(null)
  const nextId = useRef(0)

  useEffect(() => () => inFlight.current?.abort(), [])

  const send = useCallback(
    (text: string) => {
      const question = text.trim()
      if (!question || inFlight.current) return

      const asked: ChatMessage = {
        id: `user-${nextId.current++}`,
        role: 'user',
        text: question,
      }
      const conversation = [...latest.current, asked]
      setMessages(conversation)
      setPending(true)

      const controller = new AbortController()
      inFlight.current = controller
      const answer = (reply: Omit<ChatMessage, 'id' | 'role'>) => {
        if (controller.signal.aborted) return
        setMessages((prev) => [
          ...prev,
          { id: `assistant-${nextId.current++}`, role: 'assistant', ...reply },
        ])
      }
      transport(toTurns(conversation), controller.signal)
        .then((reply) => answer({ text: reply }))
        .catch(() => answer({ text: CHAT_ERROR_REPLY, failed: true }))
        .finally(() => {
          if (inFlight.current === controller) inFlight.current = null
          if (!controller.signal.aborted) setPending(false)
        })
    },
    [transport],
  )

  return { messages, pending, send }
}
