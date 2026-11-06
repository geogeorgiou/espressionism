/**
 * The store search tool, defined once. Robospresso's model reaches it
 * through the AI SDK (`packages/agent`), a visitor's in-browser agent
 * through WebMCP (the client's store page). Both adapters hand the raw
 * input to `runStoreSearch`, so they validate and answer the same way.
 */
import { z } from 'zod'

import {
  machineSchema,
  STORE_SORTS,
  DEFAULT_SORT,
  storeFiltersSchema,
} from './schema'
import type { Machine } from './schema'
import { searchMachines } from './search'

/** Most machines one search returns. */
export const MAX_SEARCH_LIMIT = 10
/** How many machines a search returns when the agent doesn't say. */
export const DEFAULT_SEARCH_LIMIT = 5

export const SEARCH_TOOL = {
  name: 'search_espresso_machines',
  title: 'Search the espresso machine store',
  description:
    'Search the Espressionism demo store for espresso machines by price (EUR) and star rating, sorted best rated first unless asked otherwise. Returns each match with its name, brand, price, rating and product page url. Only machines from this store exist; send only the filters the user asked for.',
} as const

/**
 * What agents see as the tool's input. Plain checks only (each maps to JSON
 * Schema) with the description last in each chain; the min ≤ max rule
 * lives in `storeFiltersSchema`, which `runStoreSearch` applies next.
 */
export const searchToolInputSchema = z
  .object({
    minPrice: z
      .number()
      .nonnegative()
      .optional()
      .meta({ description: 'Lowest price in whole euros, inclusive.' }),
    maxPrice: z
      .number()
      .nonnegative()
      .optional()
      .meta({ description: 'Highest price in whole euros, inclusive.' }),
    minRating: z.number().min(0).max(5).optional().meta({
      description:
        'Lowest star rating, 0–5. Setting it hides machines nobody has rated yet.',
    }),
    sort: z.enum(STORE_SORTS).optional().meta({
      description:
        'rating_desc (best rated first, the default), price_asc or price_desc.',
    }),
    limit: z
      .number()
      .int()
      .min(1)
      .max(MAX_SEARCH_LIMIT)
      .optional()
      .meta({
        description: `How many machines to return, 1–${MAX_SEARCH_LIMIT}. Defaults to ${DEFAULT_SEARCH_LIMIT}.`,
      }),
  })
  .strict()

export type SearchToolInput = z.infer<typeof searchToolInputSchema>

/** A successful search: the store catalog, filtered and sorted. */
export const searchResultSchema = z.object({
  source: z.literal('espressionism-store'),
  filters: z.object({
    minPrice: z.number().nonnegative().optional(),
    maxPrice: z.number().nonnegative().optional(),
    minRating: z.number().min(0).max(5).optional(),
  }),
  sort: z.enum(STORE_SORTS),
  /** Matches before `limit` was applied. */
  total: z.number().int().nonnegative(),
  items: z.array(machineSchema),
})

export type SearchResult = z.infer<typeof searchResultSchema>

export interface SearchToolError {
  /** Field name, or "input" when the problem isn't tied to one field. */
  field: string
  message: string
}

export type SearchToolResult =
  | ({ ok: true } & SearchResult)
  | { ok: false; errors: SearchToolError[] }

function toErrors(issues: readonly { path: PropertyKey[]; message: string }[]) {
  return issues.map((issue) => ({
    field: issue.path.length > 0 ? issue.path.map(String).join('.') : 'input',
    message: issue.message,
  }))
}

/**
 * Runs the tool on untrusted input. Invalid input returns the errors rather
 * than throwing, so a model can fix its call and try again.
 */
export function runStoreSearch(
  input: unknown,
  machines?: readonly Machine[],
): SearchToolResult {
  const parsed = searchToolInputSchema.safeParse(input ?? {})
  if (!parsed.success) {
    return { ok: false, errors: toErrors(parsed.error.issues) }
  }
  const {
    sort = DEFAULT_SORT,
    limit = DEFAULT_SEARCH_LIMIT,
    ...rest
  } = parsed.data
  const filters = storeFiltersSchema.safeParse(rest)
  if (!filters.success) {
    return { ok: false, errors: toErrors(filters.error.issues) }
  }
  const matches = searchMachines({ ...filters.data, sort }, machines)
  return {
    ok: true,
    source: 'espressionism-store',
    filters: filters.data,
    sort,
    total: matches.length,
    items: matches.slice(0, limit),
  }
}
