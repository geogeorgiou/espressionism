import { describe, expect, it } from 'vite-plus/test'

import type { Machine } from '../../src'
import {
  findMachine,
  priceRange,
  searchMachines,
  storeFiltersSchema,
} from '../../src'

function machine(name: string, price: number, rating: number | null): Machine {
  const slug = name.toLowerCase().replace(/\s+/g, '-')
  return {
    slug,
    brand: name.split(' ')[0],
    name,
    price,
    currency: 'EUR',
    rating,
    url: `/store/${slug}`,
  }
}

const SAMPLE = [
  machine('Gaggia One', 300, 4),
  machine('Sage Two', 900, 3.5),
  machine('Lelit Three', 150, null),
  machine('Breville Four', 600, 4),
  machine('Philips Five', 1200, 4.8),
]

const names = (ms: Machine[]) => ms.map((m) => m.name)

describe('searchMachines sorting', () => {
  it('defaults to best rated first, ties by name, unrated last', () => {
    expect(names(searchMachines({}, SAMPLE))).toEqual([
      'Philips Five',
      'Breville Four',
      'Gaggia One',
      'Sage Two',
      'Lelit Three',
    ])
  })

  it('sorts by price both ways', () => {
    expect(names(searchMachines({ sort: 'price_asc' }, SAMPLE))).toEqual([
      'Lelit Three',
      'Gaggia One',
      'Breville Four',
      'Sage Two',
      'Philips Five',
    ])
    expect(names(searchMachines({ sort: 'price_desc' }, SAMPLE))).toEqual([
      'Philips Five',
      'Sage Two',
      'Breville Four',
      'Gaggia One',
      'Lelit Three',
    ])
  })

  it('breaks price ties by name', () => {
    const tied = [machine('Zeta A', 500, 3), machine('Alpha B', 500, 4.9)]
    expect(names(searchMachines({ sort: 'price_asc' }, tied))).toEqual([
      'Alpha B',
      'Zeta A',
    ])
    expect(names(searchMachines({ sort: 'price_desc' }, tied))).toEqual([
      'Alpha B',
      'Zeta A',
    ])
  })

  it('does not reorder the input', () => {
    const input = [...SAMPLE]
    searchMachines({ sort: 'price_asc' }, input)
    expect(input).toEqual(SAMPLE)
  })
})

describe('searchMachines filters', () => {
  it('keeps price bounds inclusive', () => {
    expect(
      names(searchMachines({ minPrice: 300, maxPrice: 900 }, SAMPLE)),
    ).toEqual(['Breville Four', 'Gaggia One', 'Sage Two'])
  })

  it('treats a missing bound as no limit', () => {
    expect(searchMachines({ minPrice: 600 }, SAMPLE)).toHaveLength(3)
    expect(searchMachines({ maxPrice: 600 }, SAMPLE)).toHaveLength(3)
  })

  it('hides unrated machines once a minimum rating is set', () => {
    expect(names(searchMachines({ minRating: 0 }, SAMPLE))).not.toContain(
      'Lelit Three',
    )
    expect(names(searchMachines({ minRating: 4 }, SAMPLE))).toEqual([
      'Philips Five',
      'Breville Four',
      'Gaggia One',
    ])
  })

  it('returns nothing when no machine matches', () => {
    expect(searchMachines({ minPrice: 2000 }, SAMPLE)).toEqual([])
  })

  it('searches the real catalog by default', () => {
    expect(searchMachines()).toHaveLength(10)
  })
})

describe('storeFiltersSchema', () => {
  it('accepts open and valid ranges', () => {
    expect(storeFiltersSchema.safeParse({}).success).toBe(true)
    expect(
      storeFiltersSchema.safeParse({ minPrice: 200, maxPrice: 200 }).success,
    ).toBe(true)
  })

  it('rejects negatives and min above max', () => {
    expect(storeFiltersSchema.safeParse({ minPrice: -1 }).success).toBe(false)
    const result = storeFiltersSchema.safeParse({
      minPrice: 500,
      maxPrice: 100,
    })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.path).toEqual(['maxPrice'])
  })
})

describe('lookups', () => {
  it('finds a machine by slug', () => {
    expect(findMachine('sage-two', SAMPLE)?.name).toBe('Sage Two')
    expect(findMachine('nope', SAMPLE)).toBeUndefined()
  })

  it('reports the price range', () => {
    expect(priceRange(SAMPLE)).toEqual({ min: 150, max: 1200 })
  })
})
