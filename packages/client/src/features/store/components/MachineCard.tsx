import type { Machine } from '@espressionism/store'
import { Link } from '@tanstack/react-router'

import type { StoreSearch } from '../constants'
import { formatPrice } from '../utils/format'
import { MachineRating } from './MachineRating'
import { MachineSprite } from './MachineSprite'

interface MachineCardProps {
  machine: Machine
  /** The store's current filters, carried to the product page and back. */
  search: StoreSearch
}

export function MachineCard({ machine, search }: MachineCardProps) {
  return (
    <Link
      to="/store/$slug"
      params={{ slug: machine.slug }}
      search={search}
      className="group flex h-full flex-col gap-4 rounded-lg border-2 border-foreground bg-card p-4 text-foreground no-underline shadow-pixel transition-transform hover:-translate-y-0.5 focus-visible:-translate-y-0.5 motion-reduce:transition-none"
    >
      <span className="flex justify-center rounded-md bg-screen p-3">
        <MachineSprite
          slug={machine.slug}
          className="size-24 group-hover:animate-hop motion-reduce:animate-none"
        />
      </span>
      <span className="flex flex-1 flex-col gap-2">
        <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
          {machine.brand}
        </span>
        <h2 className="font-pixel text-base leading-snug group-hover:text-primary">
          {machine.name}
        </h2>
        <MachineRating rating={machine.rating} />
      </span>
      <span className="font-pixel text-xl">{formatPrice(machine)}</span>
    </Link>
  )
}
