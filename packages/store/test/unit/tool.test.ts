import { describe, expect, it } from 'vite-plus/test'
import { z } from 'zod'

import type { Machine } from '../../src'
import {
  CATALOG,
  DEFAULT_SEARCH_LIMIT,
  SEARCH_TOOL,
  runStoreSearch,
  searchResultSchema,
  searchToolInputSchema,
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

describe('runStoreSearch', () => {
  it('filters and sorts like the store page, best rated first', () => {
    const result = runStoreSearch({ maxPrice: 900 }, SAMPLE)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.items.map((m) => m.name)).toEqual([
      'Breville Four',
      'Gaggia One',
      'Sage Two',
      'Lelit Three',
    ])
    expect(result.sort).toBe('rating_desc')
    expect(result.filters).toEqual({ maxPrice: 900 })
    expect(result.source).toBe('espressionism-store')
  })

  it('treats missing input as an empty search', () => {
    const result = runStoreSearch(undefined, SAMPLE)
    expect(result.ok && result.total).toBe(SAMPLE.length)
  })

  it('applies the limit after counting every match', () => {
    const result = runStoreSearch({ sort: 'price_asc', limit: 2 }, SAMPLE)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.total).toBe(5)
    expect(result.items.map((m) => m.price)).toEqual([150, 300])
  })

  it(`returns ${DEFAULT_SEARCH_LIMIT} machines when no limit is sent`, () => {
    const result = runStoreSearch({})
    expect(result.ok && result.items.length).toBe(DEFAULT_SEARCH_LIMIT)
    expect(result.ok && result.total).toBe(CATALOG.length)
  })

  it('returns a result that matches the shared schema', () => {
    const result = runStoreSearch({ minRating: 4 })
    if (!result.ok) throw new Error('expected a result')
    const { ok: _ok, ...data } = result
    expect(searchResultSchema.safeParse(data).success).toBe(true)
  })

  it.each([
    ['min price above max price', { minPrice: 500, maxPrice: 200 }, 'maxPrice'],
    ['an unknown filter', { brand: 'Gaggia' }, 'input'],
    ['a negative price', { minPrice: -1 }, 'minPrice'],
    ['a rating above five', { minRating: 6 }, 'minRating'],
    ['an unknown sort', { sort: 'name_asc' }, 'sort'],
    ['a limit above the cap', { limit: 50 }, 'limit'],
    ['a fractional limit', { limit: 2.5 }, 'limit'],
    ['input that is not an object', 'cheap ones', 'input'],
  ])('rejects %s with the field at fault', (_case, input, field) => {
    const result = runStoreSearch(input, SAMPLE)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.errors.map((e) => e.field)).toContain(field)
  })
})

describe('the tool definition', () => {
  it('uses one snake_case name for every host', () => {
    expect(SEARCH_TOOL.name).toBe('search_espresso_machines')
  })

  it('describes every input field to agents in its JSON Schema', () => {
    const schema = z.toJSONSchema(searchToolInputSchema) as {
      properties: Record<string, { description?: string }>
      additionalProperties: unknown
    }
    expect(Object.keys(schema.properties).toSorted()).toEqual([
      'limit',
      'maxPrice',
      'minPrice',
      'minRating',
      'sort',
    ])
    for (const property of Object.values(schema.properties)) {
      expect(property.description).toBeTruthy()
    }
    expect(schema.additionalProperties).toBe(false)
  })
})
