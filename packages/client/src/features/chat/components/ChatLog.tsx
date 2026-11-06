import { useEffect, useRef } from 'react'

import { Robospresso } from '@/features/mascot/components/Robospresso'
import type { RobotMood } from '@/features/mascot/utils/robot-sprite'

import { CHAT_ERROR_REPLY } from '../constants'
import type { RobospressoMessage } from '../utils/messages'
import { messageText } from '../utils/messages'
import { messageViews } from '../utils/parts'
import { MessageParts } from './MessageParts'

interface ChatLogProps {
  messages: RobospressoMessage[]
  /** Shows the "searching" bubble. */
  searching: boolean
  /** Shows the apology under whatever the failed answer got out. */
  failed: boolean
}

function Avatar({ mood = 'cool' }: { mood?: RobotMood }) {
  return (
    <span aria-hidden className="shrink-0 rounded-md bg-screen p-1">
      <Robospresso mood={mood} animated className="size-7" label="" />
    </span>
  )
}

export function ChatLog({ messages, searching, failed }: ChatLogProps) {
  const logRef = useRef<HTMLOListElement>(null)

  // `relative` on the log matters: the cards' sr-only text is absolutely
  // positioned, and without a positioned ancestor it lands against the page,
  // stretching it as far down as the scrolled-away cards go.
  //
  // Keep the newest message in view after every render: streamed text,
  // cards and the "searching" bubble all grow the log, and the scroll is
  // cheap.
  useEffect(() => {
    const log = logRef.current
    if (log) log.scrollTop = log.scrollHeight
  })

  return (
    <ol
      ref={logRef}
      role="log"
      aria-live="polite"
      aria-label="Conversation"
      className="relative flex h-80 flex-col gap-3 overflow-y-auto px-5 py-4 sm:h-96"
    >
      {messages.map((message) => {
        if (message.role === 'user') {
          return (
            <li key={message.id} className="flex max-w-[85%] self-end">
              <p className="rounded-md border-2 border-foreground bg-primary px-3 py-2 text-base text-primary-foreground">
                <span className="sr-only">You: </span>
                {messageText(message)}
              </p>
            </li>
          )
        }
        // An answer that so far is only its store search shows as the
        // "searching" bubble below instead.
        if (messageViews(message).length === 0) return null
        return (
          <li
            key={message.id}
            className="flex w-full max-w-[92%] items-end gap-2 self-start"
          >
            <Avatar />
            <MessageParts message={message} />
          </li>
        )
      })}
      {searching && (
        <li className="flex items-end gap-2 self-start">
          <Avatar mood="searching" />
          <p className="rounded-md border-2 border-dashed border-foreground bg-card px-3 py-2 font-pixel text-sm text-muted-foreground">
            <span className="animate-pulse motion-reduce:animate-none">
              Scanning the store…
            </span>
          </p>
        </li>
      )}
      {failed && (
        <li className="flex max-w-[85%] items-end gap-2 self-start">
          <Avatar />
          <p className="rounded-md border-2 border-dashed border-destructive bg-secondary px-3 py-2 text-base text-secondary-foreground">
            <span className="sr-only">Robospresso: </span>
            {CHAT_ERROR_REPLY}
          </p>
        </li>
      )}
    </ol>
  )
}
