import { z } from 'zod'

/** One espresso machine in the demo store. */
export const machineSchema = z.object({
  /** URL-safe id, unique across the catalog. */
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  brand: z.string().min(1),
  /** Full product name, brand included. */
  name: z.string().min(1),
  /** Whole euros. */
  price: z.number().int().positive(),
  currency: z.literal('EUR'),
  /** 0–5 stars, one decimal; null when nobody has rated it yet. */
  rating: z.number().min(0).max(5).nullable(),
  /** The product's page on this site, `/store/<slug>`. */
  url: z.string().startsWith('/store/'),
})

export type Machine = z.infer<typeof machineSchema>

export const STORE_SORTS = ['rating_desc', 'price_asc', 'price_desc'] as const
export type StoreSort = (typeof STORE_SORTS)[number]

/** Best rated first: what the store shows before anyone picks a sort. */
export const DEFAULT_SORT: StoreSort = 'rating_desc'

/** Filters over the catalog. Bounds are inclusive; leave one out for no limit. */
export const storeFiltersSchema = z
  .object({
    minPrice: z.number().nonnegative().optional(),
    maxPrice: z.number().nonnegative().optional(),
    minRating: z.number().min(0).max(5).optional(),
  })
  .refine(
    ({ minPrice, maxPrice }) =>
      minPrice === undefined || maxPrice === undefined || minPrice <= maxPrice,
    { message: 'minPrice must not exceed maxPrice', path: ['maxPrice'] },
  )

export type StoreFilters = z.infer<typeof storeFiltersSchema>

export interface StoreQuery extends StoreFilters {
  sort?: StoreSort
}
