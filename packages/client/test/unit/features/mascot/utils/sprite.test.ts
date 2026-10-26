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
