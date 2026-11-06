import { describe, expect, it } from 'vite-plus/test'

import {
  EMPTY_FILTERS,
  storeFormSchema,
  storeSearchSchema,
} from '@/features/store/constants'

function issuesFor(values: Partial<typeof EMPTY_FILTERS>) {
  const result = storeFormSchema.safeParse({ ...EMPTY_FILTERS, ...values })
  return result.success
    ? []
    : result.error.issues.map((i) => ({ path: i.path, message: i.message }))
}

describe('storeFormSchema', () => {
  it('accepts empty boxes as no limit', () => {
    expect(storeFormSchema.parse(EMPTY_FILTERS)).toMatchObject({
      minPrice: undefined,
      maxPrice: undefined,
    })
  })

  it('rejects negative prices', () => {
    expect(issuesFor({ minPrice: -5 })).toEqual([
      { path: ['minPrice'], message: "Min price can't be negative" },
    ])
  })

  it('rejects a max below the min, on the max field', () => {
    expect(issuesFor({ minPrice: 500, maxPrice: 400 })).toEqual([
      { path: ['maxPrice'], message: "Max price can't be below min price" },
    ])
    expect(issuesFor({ minPrice: 500, maxPrice: 500 })).toEqual([])
  })
})

describe('storeSearchSchema', () => {
  it('drops invalid params instead of failing', () => {
    expect(
      storeSearchSchema.parse({
        minPrice: -1,
        maxPrice: 'lots',
        minRating: 2,
        sort: 'random',
      }),
    ).toEqual({})
  })

  it('keeps valid params', () => {
    const search = {
      minPrice: 0,
      maxPrice: 800,
      minRating: 4,
      sort: 'price_asc',
    }
    expect(storeSearchSchema.parse(search)).toEqual(search)
  })
})
