import { describe, expect, it } from 'vite-plus/test'

import {
  MAGNIFIER_COLORS,
  MAGNIFIER_ORIGIN,
  MAGNIFIER_SWEEP,
  ROBOT_MOODS,
  buildRobospresso,
} from '@/features/mascot/utils/robot-sprite'
import {
  FLAVOR_COLORS,
  GRID_SIZE,
  MASCOT_FLAVORS,
} from '@/features/mascot/utils/sprite'

describe('Robospresso sprite', () => {
  it('keeps every pixel inside the grid, even at the far end of the sweep', () => {
    for (const mood of ROBOT_MOODS) {
      for (const flavor of MASCOT_FLAVORS) {
        for (const p of buildRobospresso(mood, flavor)) {
          const shift = p.part === 'magnifier' ? MAGNIFIER_SWEEP : 0
          expect(p.x - shift).toBeGreaterThanOrEqual(0)
          expect(p.x).toBeLessThan(GRID_SIZE)
          expect(p.y).toBeGreaterThanOrEqual(0)
          expect(p.y).toBeLessThan(GRID_SIZE)
        }
      }
    }
  })

  it('draws one pixel per spot, so nothing is painted twice', () => {
    const spots = buildRobospresso('cool').map((p) => `${p.x},${p.y}`)
    expect(new Set(spots).size).toBe(spots.length)
  })

  it('only holds the magnifying glass while searching', () => {
    expect(buildRobospresso('cool').some((p) => p.part === 'magnifier')).toBe(
      false,
    )
    const glass = buildRobospresso('searching').filter(
      (p) => p.part === 'magnifier',
    )
    expect(glass.length).toBeGreaterThan(0)
    expect(Math.min(...glass.map((p) => p.x))).toBe(MAGNIFIER_ORIGIN.x)
    expect(glass.some((p) => p.opacity < 1)).toBe(true)
  })

  it('keeps the glass in fixed colors, so it reads on every theme', () => {
    const fixed = new Set(Object.values(MAGNIFIER_COLORS).map((c) => c.fill))
    const glass = buildRobospresso('searching').filter(
      (p) => p.part === 'magnifier',
    )
    expect(glass.every((p) => fixed.has(p.fill))).toBe(true)
  })

  it('tags the antenna light so it can blink', () => {
    const antenna = buildRobospresso('cool').filter((p) => p.part === 'antenna')
    expect(antenna).toHaveLength(4)
    expect(antenna.every((p) => p.y < 3)).toBe(true)
  })

  it('reads body colors from the theme and the panel from the flavor', () => {
    const fills = new Set(buildRobospresso('cool', 'matcha').map((p) => p.fill))
    expect(fills).toContain('var(--robot-body, var(--mug-body, #f4ead8))')
    expect(fills).toContain(FLAVOR_COLORS.matcha.B)
    expect(fills).not.toContain(FLAVOR_COLORS.house.B)
  })
})
