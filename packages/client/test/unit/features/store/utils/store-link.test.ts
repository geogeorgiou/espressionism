import { describe, expect, it } from 'vite-plus/test'

import { storeLink } from '@/features/store/utils/store-link'

describe('storeLink', () => {
  it('shows a rating between steps as the next one down', () => {
    expect(
      storeLink({
        filters: { minPrice: 200, maxPrice: 600, minRating: 4.6 },
        sort: 'rating_desc',
      }),
    ).toEqual({ minPrice: 200, maxPrice: 600, minRating: 4.5 })
  })

  it('leaves out the defaults', () => {
    expect(storeLink({ filters: {}, sort: 'rating_desc' })).toEqual({})
    expect(storeLink({ filters: {}, sort: 'price_asc' })).toEqual({
      sort: 'price_asc',
    })
  })
})
