import { describe, expect, it } from 'vite-plus/test'

import {
  FLAVOR_COLORS,
  GRID_SIZE,
  MASCOT_FLAVORS,
  MASCOT_FORMS,
  MASCOT_MOODS,
  buildMascot,
  stampFace,
} from '@/features/mascot/utils/sprite'

function eyeRows(rows: string[][]): number[] {
  return rows.flatMap((row, y) => (row.includes('E') ? [y] : []))
}

describe('Bitspresso sprite', () => {
  it('keeps every pixel of every combination inside the grid', () => {
    for (const form of MASCOT_FORMS) {
      for (const mood of MASCOT_MOODS) {
        for (const flavor of MASCOT_FLAVORS) {
          for (const p of buildMascot(form, mood, flavor)) {
            expect(p.x).toBeGreaterThanOrEqual(0)
            expect(p.x).toBeLessThan(GRID_SIZE)
            expect(p.y).toBeGreaterThanOrEqual(0)
            expect(p.y).toBeLessThan(GRID_SIZE)
          }
        }
      }
    }
  })

  it('stamps the face at the same height on both forms', () => {
    expect(eyeRows(stampFace('mug', 'idle'))).toEqual(
      eyeRows(stampFace('togo', 'idle')),
    )
  })

  it('paints the flavor band in the flavor color', () => {
    const fills = buildMascot('togo', 'idle', 'matcha').map((p) => p.fill)
    expect(fills).toContain(FLAVOR_COLORS.matcha.B)
    expect(fills).not.toContain(FLAVOR_COLORS.cherry.B)
  })

  it('swaps steam for a Z when sleepy', () => {
    const steamy = buildMascot('mug', 'idle', 'house').filter((p) => p.y < 5)
    const sleepy = buildMascot('mug', 'sleepy', 'house').filter((p) => p.y < 5)
    expect(steamy.every((p) => p.x < 15)).toBe(true)
    expect(sleepy.every((p) => p.x >= 15)).toBe(true)
  })
})

describe('Bitspresso pixel parts', () => {
  it('tags steam by wisp so it can be animated', () => {
    const steam = buildMascot('mug', 'idle', 'house').filter(
      (p) => p.part === 'steam',
    )
    expect(new Set(steam.map((p) => p.wisp))).toEqual(new Set([0, 1, 2]))
    expect(steam.every((p) => p.y < 5)).toBe(true)
  })

  it('tags the sleepy Z and leaves no steam', () => {
    const pixels = buildMascot('togo', 'sleepy', 'latte')
    expect(pixels.some((p) => p.part === 'z')).toBe(true)
    expect(pixels.some((p) => p.part === 'steam')).toBe(false)
  })
})

describe('Bitspresso scared mood', () => {
  it('squeezes the eyes shut into > <', () => {
    for (const form of MASCOT_FORMS) {
      const eyes = stampFace(form, 'scared')
        .map((row) => row.flatMap((ch, x) => (ch === 'E' ? [x] : [])))
        .filter((xs) => xs.length > 0)
      const left = Math.min(...eyes.flat())
      expect(eyes.map((xs) => xs.map((x) => x - left))).toEqual([
        [0, 7],
        [1, 6],
        [0, 7],
      ])
    }
  })

  it('drops the cheeks and adds a sweat drop', () => {
    const pixels = buildMascot('mug', 'scared', 'house')
    expect(pixels.some((p) => p.fill.includes('--mug-cheeks'))).toBe(false)
    const sweat = pixels.filter((p) => p.part === 'sweat')
    expect(sweat.length).toBeGreaterThan(0)
    expect(sweat.every((p) => p.fill === 'var(--mug-sweat, #7cc6f2)')).toBe(
      true,
    )
  })

  it('keeps the sweat drop to the scared face', () => {
    for (const mood of MASCOT_MOODS.filter((m) => m !== 'scared')) {
      const pixels = buildMascot('togo', mood, 'latte')
      expect(pixels.some((p) => p.part === 'sweat')).toBe(false)
    }
  })
})

describe('Bitspresso theme colors', () => {
  it('reads body colors from the theme, with Diner fallbacks', () => {
    const fills = new Set(
      buildMascot('mug', 'idle', 'house').map((p) => p.fill),
    )
    expect(fills).toContain('var(--mug-body, #f4ead8)')
    expect(fills).toContain('var(--mug-outline, #2a1810)')
  })

  it('keeps the flavor band as a fixed drink color', () => {
    const fills = new Set(
      buildMascot('togo', 'idle', 'cherry').map((p) => p.fill),
    )
    expect(fills).toContain(FLAVOR_COLORS.cherry.B)
  })
})
