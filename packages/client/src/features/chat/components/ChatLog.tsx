import { clsx } from 'clsx'
import { useEffect, useRef } from 'react'

import { Robospresso } from '@/features/mascot/components/Robospresso'
import type { RobotMood } from '@/features/mascot/utils/robot-sprite'

import type { ChatMessage } from '../utils/messages'

interface ChatLogProps {
  messages: ChatMessage[]
  pending: boolean
}

function Avatar({ mood = 'cool' }: { mood?: RobotMood }) {
  return (
    <span aria-hidden className="shrink-0 rounded-md bg-screen p-1">
      <Robospresso mood={mood} animated className="size-7" label="" />
    </span>
  )
}

export function ChatLog({ messages, pending }: ChatLogProps) {
  const logRef = useRef<HTMLOListElement>(null)

  // Keep the newest message in view after every render: a new message or the
  // "searching" bubble both grow the log, and the scroll is cheap.
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
      className="flex h-80 flex-col gap-3 overflow-y-auto px-5 py-4 sm:h-96"
    >
      {messages.map((message) => {
        const mine = message.role === 'user'
        return (
          <li
            key={message.id}
            className={clsx(
              'flex max-w-[85%] items-end gap-2',
              mine ? 'self-end' : 'self-start',
            )}
          >
            {!mine && <Avatar />}
            <p
              className={clsx(
                'rounded-md border-2 border-foreground px-3 py-2 text-base',
                mine
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary text-secondary-foreground',
              )}
            >
              <span className="sr-only">
                {mine ? 'You: ' : 'Robospresso: '}
              </span>
              {message.text}
            </p>
          </li>
        )
      })}
      {pending && (
        <li className="flex items-end gap-2 self-start">
          <Avatar mood="searching" />
          <p className="rounded-md border-2 border-dashed border-foreground bg-card px-3 py-2 font-pixel text-sm text-muted-foreground">
            <span className="animate-pulse motion-reduce:animate-none">
              Scanning Skroutz for deals…
            </span>
          </p>
        </li>
      )}
    </ol>
  )
}
