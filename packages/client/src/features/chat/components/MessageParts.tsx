import { Link } from '@tanstack/react-router'
import { ArrowUpRight } from 'lucide-react'
import { Fragment } from 'react'
import type { ReactNode } from 'react'

import { MachineCard } from '@/features/store/components/MachineCard'

import type { RobospressoMessage } from '../utils/messages'
import type { PartView } from '../utils/parts'
import { messageViews } from '../utils/parts'

const BUBBLE =
  'w-fit rounded-md border-2 border-foreground bg-secondary px-3 py-2 text-base text-secondary-foreground'

type Renderers = {
  [K in PartView['kind']]: (view: Extract<PartView, { kind: K }>) => ReactNode
}

/**
 * The renderer registry's JSX half: one component per kind of part. To draw
 * a new tool, add its view in `toPartView` and its renderer here.
 */
const RENDERERS: Renderers = {
  text: ({ text }) => <p className={BUBBLE}>{text}</p>,
  'cards-loading': ({ count }) => (
    <ul aria-label="Loading machines" className="flex flex-col gap-2">
      {Array.from({ length: count }, (_, i) => (
        <li
          key={i}
          aria-hidden
          className="flex h-[4.75rem] items-center gap-3 rounded-lg border-2 border-dashed border-foreground bg-card p-2"
        >
          <span className="size-[3.75rem] shrink-0 animate-pulse rounded-md bg-muted motion-reduce:animate-none" />
          <span className="flex flex-1 flex-col gap-2">
            <span className="h-3 w-1/3 animate-pulse bg-muted motion-reduce:animate-none" />
            <span className="h-3 w-2/3 animate-pulse bg-muted motion-reduce:animate-none" />
          </span>
        </li>
      ))}
    </ul>
  ),
  cards: ({ machines }) => (
    <ul aria-label="Recommended machines" className="flex flex-col gap-2">
      {machines.map((machine) => (
        <li key={machine.slug}>
          <MachineCard machine={machine} search={{}} variant="compact" newTab />
        </li>
      ))}
    </ul>
  ),
  'store-link': ({ search, total }) => (
    <Link
      to="/store"
      search={search}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-11 w-full items-center justify-center gap-1.5 rounded-md border-2 border-foreground bg-card px-3 py-2 text-center font-pixel text-sm text-foreground no-underline shadow-pixel hover:text-primary sm:w-fit"
    >
      See all {total} in the store
      <ArrowUpRight aria-hidden className="size-4" />
      <span className="sr-only"> (opens in new tab)</span>
    </Link>
  ),
}

function renderView(view: PartView): ReactNode {
  const render = RENDERERS[view.kind] as (view: PartView) => ReactNode
  return render(view)
}

/** Robospresso's message, part by part: text bubbles, cards, links. */
export function MessageParts({ message }: { message: RobospressoMessage }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      <span className="sr-only">Robospresso: </span>
      {messageViews(message).map(({ key, ...view }) => (
        <Fragment key={key}>{renderView(view)}</Fragment>
      ))}
    </div>
  )
}
