import { DEFAULT_SORT } from '@espressionism/store'
import type { StoreQuery } from '@espressionism/store'

import type {
  StoreFormOutput,
  StoreFormValues,
  StoreSearch,
} from '../constants'
import { ANY_RATING, EMPTY_FILTERS, MIN_RATINGS } from '../constants'

/** Valid form values → URL search params, leaving out defaults. */
export function formToSearch(values: StoreFormOutput): StoreSearch {
  const minRating = MIN_RATINGS.find((r) => String(r) === values.minRating)
  return {
    minPrice: values.minPrice,
    maxPrice: values.maxPrice,
    minRating,
    sort: values.sort === DEFAULT_SORT ? undefined : values.sort,
  }
}

/** URL search params → the filter form's starting values. */
export function searchToForm(search: StoreSearch): StoreFormValues {
  return {
    minPrice: search.minPrice ?? EMPTY_FILTERS.minPrice,
    maxPrice: search.maxPrice ?? EMPTY_FILTERS.maxPrice,
    minRating:
      search.minRating === undefined ? ANY_RATING : String(search.minRating),
    sort: search.sort ?? DEFAULT_SORT,
  }
}

/**
 * URL search params → a catalog query. A hand-edited URL with min above max
 * drops the price range rather than showing nothing.
 */
export function searchToQuery(search: StoreSearch): StoreQuery {
  const { minPrice, maxPrice, minRating, sort } = search
  const inverted =
    minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice
  return inverted
    ? { minRating, sort }
    : { minPrice, maxPrice, minRating, sort }
}

/** Drops undefined keys so links and the URL stay tidy. */
export function compactSearch(search: StoreSearch): StoreSearch {
  return Object.fromEntries(
    Object.entries(search).filter(([, value]) => value !== undefined),
  )
}
