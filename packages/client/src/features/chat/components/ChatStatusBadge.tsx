import { clsx } from 'clsx'

import { CHAT_STATUS_COPY } from '../constants'

/** "● Live" (green) or "● Offline" (red). */
export function ChatStatusBadge({ live }: { live: boolean }) {
  const copy = CHAT_STATUS_COPY[live ? 'live' : 'offline']
  return (
    <span
      data-status={live ? 'live' : 'offline'}
      title={copy.title}
      className="ml-auto hidden shrink-0 items-center gap-1.5 bg-screen-foreground px-2.5 py-1 font-pixel text-xs text-screen sm:inline-flex"
    >
      <span
        aria-hidden
        className={clsx(
          'size-2 rounded-full',
          live ? 'bg-green-500 motion-safe:animate-pulse' : 'bg-red-500',
        )}
      />
      {copy.badge}
      <span className="sr-only">: {copy.title}</span>
    </span>
  )
}
