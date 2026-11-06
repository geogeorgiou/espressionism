import { CATALOG } from './catalog'
import type { Machine, StoreQuery, StoreSort } from './schema'
import { DEFAULT_SORT } from './schema'

type Compare = (a: Machine, b: Machine) => number

const byName: Compare = (a, b) => a.name.localeCompare(b.name, 'en')

/** Unrated machines always go last. */
const byRatingDesc: Compare = (a, b) =>
  (b.rating ?? -1) - (a.rating ?? -1) || byName(a, b)

const COMPARE: Record<StoreSort, Compare> = {
  rating_desc: byRatingDesc,
  price_asc: (a, b) => a.price - b.price || byName(a, b),
  price_desc: (a, b) => b.price - a.price || byName(a, b),
}

/**
 * Filters and sorts the catalog. Price bounds are inclusive; `minRating`
 * hides unrated machines. Ties are broken by name, so the order is stable.
 */
export function searchMachines(
  query: StoreQuery = {},
  machines: readonly Machine[] = CATALOG,
): Machine[] {
  const { minPrice, maxPrice, minRating, sort = DEFAULT_SORT } = query
  return machines
    .filter(
      (m) =>
        (minPrice === undefined || m.price >= minPrice) &&
        (maxPrice === undefined || m.price <= maxPrice) &&
        (minRating === undefined ||
          (m.rating !== null && m.rating >= minRating)),
    )
    .toSorted(COMPARE[sort])
}

export function findMachine(
  slug: string,
  machines: readonly Machine[] = CATALOG,
): Machine | undefined {
  return machines.find((m) => m.slug === slug)
}

/** Cheapest and dearest price in the catalog. */
export function priceRange(machines: readonly Machine[] = CATALOG): {
  min: number
  max: number
} {
  const prices = machines.map((m) => m.price)
  return { min: Math.min(...prices), max: Math.max(...prices) }
}
