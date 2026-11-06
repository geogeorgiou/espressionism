import { describe, expect, it } from 'vite-plus/test'

import { EMPTY_FILTERS, storeFormSchema } from '@/features/store/constants'
import {
  agentSearchToForm,
  compactSearch,
  formToSearch,
  searchToForm,
  searchToQuery,
} from '@/features/store/utils/query'

describe('formToSearch', () => {
  it('leaves empty filters and the default sort out of the URL', () => {
    const parsed = storeFormSchema.parse(EMPTY_FILTERS)
    expect(compactSearch(formToSearch(parsed))).toEqual({})
  })

  it('keeps chosen filters, with the rating as a number', () => {
    const parsed = storeFormSchema.parse({
      minPrice: 200,
      maxPrice: 900,
      minRating: '4.5',
      sort: 'price_desc',
    })
    expect(formToSearch(parsed)).toEqual({
      minPrice: 200,
      maxPrice: 900,
      minRating: 4.5,
      sort: 'price_desc',
    })
  })
})

describe('searchToForm', () => {
  it('fills empty boxes and defaults for missing params', () => {
    const values = searchToForm({})
    expect(values.minPrice).toBeNaN()
    expect(values.maxPrice).toBeNaN()
    expect(values.minRating).toBe('any')
    expect(values.sort).toBe('rating_desc')
  })

  it('round-trips through the form schema', () => {
    const search = {
      minPrice: 100,
      minRating: 3 as const,
      sort: 'price_asc' as const,
    }
    const parsed = storeFormSchema.parse(searchToForm(search))
    expect(compactSearch(formToSearch(parsed))).toEqual(search)
  })
})

describe('searchToQuery', () => {
  it('drops an upside-down price range from a hand-edited URL', () => {
    expect(
      searchToQuery({ minPrice: 900, maxPrice: 100, minRating: 4 }),
    ).toEqual({ minRating: 4, sort: undefined })
  })
})

/** The rating the form shows for an agent's minimum rating. */
function shownRating(minRating: number) {
  return agentSearchToForm({ filters: { minRating }, sort: 'rating_desc' })
    .minRating
}

describe('agentSearchToForm', () => {
  it("replaces every filter with the agent's search", () => {
    expect(agentSearchToForm({ filters: {}, sort: 'rating_desc' })).toEqual(
      EMPTY_FILTERS,
    )
    expect(
      agentSearchToForm({
        filters: { minPrice: 100, maxPrice: 400, minRating: 4.5 },
        sort: 'price_desc',
      }),
    ).toEqual({
      minPrice: 100,
      maxPrice: 400,
      minRating: '4.5',
      sort: 'price_desc',
    })
  })

  it('shows a rating between the steps as the next one down', () => {
    expect(shownRating(4.2)).toBe('4')
    expect(shownRating(3)).toBe('3')
    expect(shownRating(2.5)).toBe('any')
    expect(shownRating(5)).toBe('4.5')
  })
})
