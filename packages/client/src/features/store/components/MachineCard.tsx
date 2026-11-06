import type { Machine } from '@espressionism/store'
import { Link } from '@tanstack/react-router'
import { clsx } from 'clsx'
import { ArrowUpRight } from 'lucide-react'

import type { StoreSearch } from '../constants'
import { formatPrice } from '../utils/format'
import { MachineRating } from './MachineRating'
import { MachineSprite } from './MachineSprite'

interface MachineCardProps {
  machine: Machine
  /** The store's current filters, carried to the product page and back. */
  search: StoreSearch
  /**
   * `grid` for the store page; `compact` is a dense row for narrow columns
   * (Robospresso's chat).
   */
  variant?: 'grid' | 'compact'
  /** Opens the product page in a new tab, so the current page keeps its state. */
  newTab?: boolean
}

export function MachineCard({
  machine,
  search,
  variant = 'grid',
  newTab = false,
}: MachineCardProps) {
  const compact = variant === 'compact'
  const Heading = compact ? 'h3' : 'h2'
  return (
    <Link
      to="/store/$slug"
      params={{ slug: machine.slug }}
      search={search}
      {...(newTab && { target: '_blank', rel: 'noopener noreferrer' })}
      className={clsx(
        'group flex rounded-lg border-2 border-foreground bg-card text-foreground no-underline transition-transform hover:-translate-y-0.5 focus-visible:-translate-y-0.5 motion-reduce:transition-none',
        compact
          ? 'min-h-11 items-center gap-3 p-2 shadow-pixel'
          : 'h-full flex-col gap-4 p-4 shadow-pixel',
      )}
    >
      <span
        className={clsx(
          'flex shrink-0 justify-center rounded-md bg-screen',
          compact ? 'p-1.5' : 'p-3',
        )}
      >
        <MachineSprite
          slug={machine.slug}
          className={clsx(
            'group-hover:animate-hop motion-reduce:animate-none',
            compact ? 'size-12' : 'size-24',
          )}
        />
      </span>
      <span
        className={clsx(
          'flex min-w-0 flex-1 flex-col',
          compact ? 'gap-0.5' : 'gap-2',
        )}
      >
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {machine.brand}
        </span>
        <Heading
          className={clsx(
            'font-pixel leading-snug group-hover:text-primary',
            compact ? 'text-sm' : 'text-base',
          )}
        >
          {machine.name}
        </Heading>
        <MachineRating rating={machine.rating} />
      </span>
      <span
        className={clsx(
          'flex shrink-0 items-center gap-1 font-pixel',
          compact ? 'self-start text-base' : 'text-xl',
        )}
      >
        {formatPrice(machine)}
        {newTab && (
          <>
            <ArrowUpRight
              aria-hidden
              className="size-4 text-muted-foreground"
            />
            <span className="sr-only"> (opens in new tab)</span>
          </>
        )}
      </span>
    </Link>
  )
}
