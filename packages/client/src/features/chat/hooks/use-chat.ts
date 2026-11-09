import { useChat as useAiChat } from '@ai-sdk/react'
import {
  fillCalculatorOutputSchema,
  sessionDataSchema,
} from '@espressionism/agent/contract'
import type {
  CalculatorValues,
  FillToolOutput,
} from '@espressionism/calculator'
import { useCallback, useEffect, useRef, useState } from 'react'

import { CHAT_GREETING } from '../constants'
import type {
  RobospressoMessage,
  RobospressoTransport,
  SendBody,
} from '../utils/messages'
import { GREETING_ID, createChatTransport } from '../utils/messages'
import { isSearching } from '../utils/parts'

/** A successful `fill_calculator` answer, ready to put on the form. */
export type CalculatorFill = Extract<FillToolOutput, { ok: true }>

/** The page's calculator, as Robospresso reads and fills it. */
export interface CalculatorHandle {
  /** The form's values, or undefined while a field is invalid. */
  getValues: () => CalculatorValues | undefined
  /** Puts a fill on the form, as if typed. */
  apply: (fill: CalculatorFill) => void
}

interface UseChatOptions {
  /** How questions reach the agent; tests pass a fake. */
  transport?: RobospressoTransport
  /** The calculator Robospresso may fill; none outside the calculator page. */
  calculator?: CalculatorHandle
}

export interface ChatState {
  messages: RobospressoMessage[]
  /** True from sending a question until its answer has finished. */
  busy: boolean
  /** True while there's nothing new to show yet (the store search). */
  searching: boolean
  /** True when the last answer failed; its partial parts stay in `messages`. */
  failed: boolean
  /**
   * Questions (1 = the first) whose answer came from a restarted session:
   * the agent had lost the conversation before them.
   */
  restartedAt: number[]
  send: (text: string) => void
  /** Starts a new chat: back to the greeting, with no session. */
  reset: () => void
}

const GREETING: RobospressoMessage = {
  id: GREETING_ID,
  role: 'assistant',
  parts: [{ type: 'text', text: CHAT_GREETING }],
}

/**
 * Conversation state over the AI SDK's chat, streaming from `POST /api/chat`.
 * The agent remembers the conversation; this hook only keeps its session id
 * (in memory, never in storage), read from each reply's `data-session` part.
 * One question at a time: a new one waits until the last answer has
 * finished (the composer is disabled).
 */
export function useChat({
  transport,
  calculator,
}: UseChatOptions = {}): ChatState {
  // Created once: the AI SDK keeps one chat per hook instance.
  const [chatTransport] = useState(() => transport ?? createChatTransport())
  const sessionId = useRef<string | undefined>(undefined)
  const asked = useRef(0)
  const calculatorRef = useRef(calculator)
  useEffect(() => {
    calculatorRef.current = calculator
  }, [calculator])
  /** `fill_calculator` calls already put on the form. */
  const applied = useRef(new Set<string>())
  const [restartedAt, setRestartedAt] = useState<number[]>([])

  const { messages, status, sendMessage, setMessages } =
    useAiChat<RobospressoMessage>({
      transport: chatTransport,
      messages: [GREETING],
      onData: (part) => {
        if (part.type !== 'data-session') return
        const session = sessionDataSchema.safeParse(part.data)
        if (!session.success) return
        sessionId.current = session.data.id
        if (session.data.restarted) {
          const question = asked.current
          setRestartedAt((list) => [...list, question])
        }
      },
    })
  const busy = status === 'submitted' || status === 'streaming'

  const send = useCallback(
    (text: string) => {
      const question = text.trim()
      if (!question || busy) return
      asked.current += 1
      const body: SendBody = {
        sessionId: sessionId.current,
        calculator: calculatorRef.current?.getValues(),
      }
      void sendMessage({ text: question }, { body })
    },
    [busy, sendMessage],
  )

  // Put each successful fill on the form once, as soon as it arrives.
  useEffect(() => {
    for (const message of messages) {
      for (const part of message.parts) {
        if (
          part.type !== 'tool-fill_calculator' ||
          part.state !== 'output-available' ||
          applied.current.has(part.toolCallId)
        ) {
          continue
        }
        applied.current.add(part.toolCallId)
        const fill = fillCalculatorOutputSchema.safeParse(part.output)
        if (fill.success && fill.data.ok)
          calculatorRef.current?.apply(fill.data)
      }
    }
  }, [messages])

  const reset = useCallback(() => {
    if (busy) return
    sessionId.current = undefined
    asked.current = 0
    setRestartedAt([])
    setMessages([GREETING])
  }, [busy, setMessages])

  return {
    messages,
    busy,
    searching: isSearching(messages, status),
    failed: status === 'error',
    restartedAt,
    send,
    reset,
  }
}
