import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

import { Robospresso } from '@/features/mascot/components/Robospresso'
import { Route } from '@/routes/store_.$slug'

import { compactSearch } from '../utils/query'

/** Shown at /store/$slug when no machine has that slug. */
export function MachineNotFound() {
  const { slug } = Route.useParams()
  const search = Route.useSearch()

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pt-6 pb-16 sm:px-6">
      <section
        aria-labelledby="not-found-title"
        className="flex flex-col items-center gap-4 rounded-lg border-2 border-foreground bg-card p-8 text-center shadow-pixel"
      >
        <span className="rounded-md bg-screen p-4">
          <Robospresso mood="searching" animated className="size-24" label="" />
        </span>
        <h1 id="not-found-title" className="font-pixel text-2xl sm:text-3xl">
          Machine not found
        </h1>
        <p className="max-w-md text-muted-foreground">
          Robospresso searched every shelf, but nothing in the store goes by{' '}
          <code className="font-semibold break-all text-foreground">
            {slug}
          </code>
          .
        </p>
        <Link
          to="/store"
          search={compactSearch(search)}
          className="flex h-11 items-center gap-2 rounded-md border-2 border-foreground px-4 font-semibold text-foreground no-underline hover:text-primary"
        >
          <ArrowLeft aria-hidden className="size-4" />
          Back to store
        </Link>
      </section>
    </div>
  )
}
