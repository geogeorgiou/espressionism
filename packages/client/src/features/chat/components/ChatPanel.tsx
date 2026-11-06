import { Robospresso } from '@/features/mascot/components/Robospresso'

import { CHAT_LIVE, CHAT_STATUS_COPY } from '../constants'
import { useChat } from '../hooks/use-chat'
import type { RobospressoTransport } from '../utils/messages'
import { ChatComposer } from './ChatComposer'
import { ChatLog } from './ChatLog'
import { ChatStatusBadge } from './ChatStatusBadge'

interface ChatPanelProps {
  /** How questions reach the agent; defaults to `POST /api/chat`. */
  transport?: RobospressoTransport
  /** Whether a model is configured; defaults to this build's flag. */
  live?: boolean
}

/**
 * "Ask Robospresso": a chat about espresso machines in our demo store, run by
 * Bitspresso's robot cousin.
 * Answers stream from `@espressionism/agent` at `/api/chat`: text, plus
 * product cards and a store link drawn from the agent's display tools.
 */
export function ChatPanel({ transport, live = CHAT_LIVE }: ChatPanelProps) {
  const { messages, busy, searching, failed, send } = useChat({ transport })

  return (
    <section
      id="chat"
      aria-labelledby="chat-title"
      className="flex scroll-mt-6 flex-col overflow-hidden rounded-lg border-2 border-foreground bg-card text-card-foreground shadow-pixel"
    >
      <header className="flex items-center gap-4 border-b-2 border-foreground bg-screen px-5 py-4 text-screen-foreground">
        <Robospresso
          mood={busy ? 'searching' : 'cool'}
          animated
          className="size-16 shrink-0 sm:size-20"
          label=""
        />
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="chat-title" className="font-pixel text-lg">
            Ask Robospresso
          </h2>
          <p className="text-sm opacity-85">
            {CHAT_STATUS_COPY[live ? 'live' : 'offline'].tagline}
          </p>
        </div>
        <ChatStatusBadge live={live} />
      </header>
      <ChatLog messages={messages} searching={searching} failed={failed} />
      <ChatComposer
        onSend={send}
        busy={busy}
        showSuggestions={!messages.some((m) => m.role === 'user')}
      />
    </section>
  )
}
