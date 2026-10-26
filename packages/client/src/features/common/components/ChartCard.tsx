import { ClientOnly } from '@tanstack/react-router'
import { clsx } from 'clsx'
import type { ReactNode } from 'react'

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

export interface LegendItem {
  label: string
  /** Tailwind background class for the swatch, e.g. `bg-chart-cafe`. */
  swatchClass: string
}

interface ChartCardProps {
  title: string
  description: string
  legend: LegendItem[]
  /** Plain-language summary read by screen readers instead of the SVG. */
  summary: string
  children: ReactNode
}

/**
 * Card frame for a react-charts chart. Charts measure their parent, so the
 * plot area has a fixed height, and they only render in the browser.
 */
export function ChartCard({
  title,
  description,
  legend,
  summary,
  children,
}: ChartCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {legend.map((item) => (
            <li key={item.label} className="flex items-center gap-2">
              <span
                aria-hidden
                className={clsx('size-3 rounded-[2px]', item.swatchClass)}
              />
              {item.label}
            </li>
          ))}
        </ul>
        <figure className="m-0">
          <div aria-hidden className="coffee-chart relative h-56 sm:h-64">
            <ClientOnly
              fallback={
                <div className="size-full animate-pulse rounded-md bg-muted" />
              }
            >
              {children}
            </ClientOnly>
          </div>
          <figcaption className="sr-only">{summary}</figcaption>
        </figure>
      </CardContent>
    </Card>
  )
}
