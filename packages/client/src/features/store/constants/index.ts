import { STORE_SORTS, searchToolInputSchema } from '@espressionism/store'
import type { StoreSort } from '@espressionism/store'
import { z } from 'zod'

export const STORE_DISCLAIMER =
  'Demo store: prices and ratings are made up, and nothing is for sale.'

export const SORT_LABELS: Record<StoreSort, string> = {
  rating_desc: 'Best rated',
  price_asc: 'Price: low to high',
  price_desc: 'Price: high to low',
}

/** Minimum-rating choices; the select holds strings, the URL holds numbers. */
export const MIN_RATINGS = [3, 4, 4.5] as const
export type MinRating = (typeof MIN_RATINGS)[number]
export const ANY_RATING = 'any'
export const RATING_CHOICES = [
  ANY_RATING,
  ...MIN_RATINGS.map((r) => String(r)),
] as const

export const RATING_OPTIONS = RATING_CHOICES.map((value) => ({
  value,
  label: value === ANY_RATING ? 'Any rating' : `${value}★ and up`,
}))

export const SORT_OPTIONS = STORE_SORTS.map((value) => ({
  value,
  label: SORT_LABELS[value],
}))

/** URL search params: every field optional, invalid values fall back. */
export const storeSearchSchema = z.object({
  minPrice: z.number().nonnegative().optional().catch(undefined),
  maxPrice: z.number().nonnegative().optional().catch(undefined),
  minRating: z
    .union(MIN_RATINGS.map((r) => z.literal(r)))
    .optional()
    .catch(undefined),
  sort: z.enum(STORE_SORTS).optional().catch(undefined),
})

export type StoreSearch = z.infer<typeof storeSearchSchema>

/** An empty price box is NaN in the form and means "no limit". */
const price = (label: string) =>
  z
    .union([z.nan(), z.number().min(0, `${label} can't be negative`)])
    .transform((value) => (Number.isNaN(value) ? undefined : value))

/** Validates the filter form; parsing also turns empty boxes into undefined. */
export const storeFormSchema = z
  .object({
    minPrice: price('Min price'),
    maxPrice: price('Max price'),
    minRating: z.enum(RATING_CHOICES),
    sort: z.enum(STORE_SORTS),
  })
  .refine(
    ({ minPrice, maxPrice }) =>
      minPrice === undefined || maxPrice === undefined || minPrice <= maxPrice,
    { message: "Max price can't be below min price", path: ['maxPrice'] },
  )

export type StoreFormValues = z.input<typeof storeFormSchema>
export type StoreFormOutput = z.output<typeof storeFormSchema>

export const EMPTY_FILTERS: StoreFormValues = {
  minPrice: Number.NaN,
  maxPrice: Number.NaN,
  minRating: ANY_RATING,
  sort: 'rating_desc',
}

/**
 * JSON Schema for the WebMCP `search_espresso_machines` tool, derived from
 * the store's shared Zod schema (Robospresso's model sees the same one).
 */
export const SEARCH_TOOL_INPUT_SCHEMA = z.toJSONSchema(searchToolInputSchema)
