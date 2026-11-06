import { Link } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

import { Route } from '@/routes/store_.$slug'

import { MachineRating } from '../components/MachineRating'
import { MachineSprite } from '../components/MachineSprite'
import { STORE_DISCLAIMER } from '../constants'
import { formatPrice } from '../utils/format'
import { compactSearch } from '../utils/query'

export function MachinePage() {
  const machine = Route.useLoaderData()
  const search = Route.useSearch()

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 px-4 pt-6 pb-16 sm:px-6">
      <Link
        to="/store"
        search={compactSearch(search)}
        className="flex h-11 w-fit items-center gap-2 font-semibold text-foreground no-underline hover:text-primary"
      >
        <ArrowLeft aria-hidden className="size-4" />
        Back to store
      </Link>

      <article
        aria-labelledby="machine-name"
        className="flex flex-col gap-6 rounded-lg border-2 border-foreground bg-card p-5 shadow-pixel sm:flex-row sm:items-center sm:gap-8 sm:p-8"
      >
        <div className="flex justify-center rounded-md bg-screen p-6">
          <MachineSprite slug={machine.slug} className="size-40 sm:size-56" />
        </div>
        <div className="flex flex-col gap-3">
          <p className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
            {machine.brand}
          </p>
          <h1
            id="machine-name"
            className="font-pixel text-2xl leading-tight sm:text-3xl"
          >
            {machine.name}
          </h1>
          <MachineRating rating={machine.rating} />
          <p className="font-pixel text-3xl">{formatPrice(machine)}</p>
          <p className="text-sm text-muted-foreground">{STORE_DISCLAIMER}</p>
        </div>
      </article>
    </div>
  )
}
