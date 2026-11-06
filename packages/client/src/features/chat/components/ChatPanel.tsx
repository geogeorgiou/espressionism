import { Robospresso } from '@/features/mascot/components/Robospresso'

import { useChat } from '../hooks/use-chat'
import type { ChatTransport } from '../utils/messages'
import { ChatComposer } from './ChatComposer'
import { ChatLog } from './ChatLog'

interface ChatPanelProps {
  /** How questions reach the agent; defaults to `POST /api/chat`. */
  transport?: ChatTransport
}

/**
 * "Ask Robospresso": a chat about espresso machines in our demo store, run by
 * Bitspresso's robot cousin.
 * Answers come from `@espressionism/agent` at `/api/chat`.
 */
export function ChatPanel({ transport }: ChatPanelProps) {
  const { messages, pending, send } = useChat({ transport })

  return (
    <section
      id="chat"
      aria-labelledby="chat-title"
      className="flex scroll-mt-6 flex-col overflow-hidden rounded-lg border-2 border-foreground bg-card text-card-foreground shadow-pixel"
    >
      <header className="flex items-center gap-4 border-b-2 border-foreground bg-screen px-5 py-4 text-screen-foreground">
        <Robospresso
          mood={pending ? 'searching' : 'cool'}
          animated
          className="size-16 shrink-0 sm:size-20"
          label=""
        />
        <div className="flex min-w-0 flex-col gap-1">
          <h2 id="chat-title" className="font-pixel text-lg">
            Ask Robospresso
          </h2>
          <p className="text-sm opacity-85">
            Your espresso concierge. Shades on, deals found.
          </p>
        </div>
        <span className="ml-auto hidden shrink-0 bg-screen-foreground px-2.5 py-1 font-pixel text-xs text-screen sm:inline">
          Preview
        </span>
      </header>
      <ChatLog messages={messages} pending={pending} />
      <ChatComposer
        onSend={send}
        busy={pending}
        showSuggestions={!messages.some((m) => m.role === 'user')}
      />
    </section>
  )
}
