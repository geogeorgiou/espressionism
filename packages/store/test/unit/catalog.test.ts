import { describe, expect, it } from 'vite-plus/test'

import { CATALOG } from '../../src/catalog'

describe('catalog', () => {
  it('has ten machines with unique slugs that match their urls', () => {
    expect(CATALOG).toHaveLength(10)
    expect(new Set(CATALOG.map((m) => m.slug)).size).toBe(10)
    for (const m of CATALOG) {
      expect(m.url).toBe(`/store/${m.slug}`)
      expect(m.name.startsWith(m.brand)).toBe(true)
    }
  })

  it('keeps prices and ratings in the agreed ranges', () => {
    for (const m of CATALOG) {
      expect(m.price).toBeGreaterThanOrEqual(149)
      expect(m.price).toBeLessThanOrEqual(1499)
      if (m.rating === null) continue
      expect(m.rating).toBeGreaterThanOrEqual(2.8)
      expect(m.rating).toBeLessThanOrEqual(4.9)
      expect(Math.round(m.rating * 10) / 10).toBe(m.rating)
    }
  })

  it('has exactly one machine nobody has rated yet', () => {
    expect(CATALOG.filter((m) => m.rating === null)).toHaveLength(1)
  })

  it('lets some cheaper machines out-rate pricier ones, like real life', () => {
    const rated = CATALOG.filter((m) => m.rating !== null)
    const inversions = rated.flatMap((cheap) =>
      rated.filter(
        (dear) => cheap.price < dear.price && cheap.rating! > dear.rating!,
      ),
    )
    expect(inversions.length).toBeGreaterThanOrEqual(2)
  })

  it('still trends up: pricier machines rate better on average', () => {
    const rated = CATALOG.filter((m) => m.rating !== null).toSorted(
      (a, b) => a.price - b.price,
    )
    const half = Math.floor(rated.length / 2)
    const mean = (ms: typeof rated) =>
      ms.reduce((sum, m) => sum + m.rating!, 0) / ms.length
    expect(mean(rated.slice(half))).toBeGreaterThan(mean(rated.slice(0, half)))
  })
})
