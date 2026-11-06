import { CATALOG } from '@espressionism/store'
import { describe, expect, it } from 'vite-plus/test'

import { GRID_SIZE } from '@/features/mascot/utils/sprite'
import {
  BODY_PALETTES,
  MACHINE_ROWS,
  buildMachineSprite,
  hashString,
} from '@/features/store/utils/machine-sprite'

describe('machine sprite', () => {
  it('is a 20×20 grid', () => {
    expect(MACHINE_ROWS).toHaveLength(GRID_SIZE)
    for (const row of MACHINE_ROWS) expect(row).toHaveLength(GRID_SIZE)
  })

  it('draws the same pixels for the same slug', () => {
    expect(buildMachineSprite('gaggia-touch-lux')).toEqual(
      buildMachineSprite('gaggia-touch-lux'),
    )
  })

  it('keeps every pixel inside the grid', () => {
    for (const p of buildMachineSprite('any-slug')) {
      expect(p.x).toBeGreaterThanOrEqual(0)
      expect(p.x).toBeLessThan(GRID_SIZE)
      expect(p.y).toBeGreaterThanOrEqual(0)
      expect(p.y).toBeLessThan(GRID_SIZE)
    }
  })

  it('gives the catalog a mix of looks', () => {
    const looks = new Set(
      CATALOG.map((m) => JSON.stringify(buildMachineSprite(m.slug))),
    )
    expect(looks.size).toBe(CATALOG.length)
    const palettes = new Set(
      CATALOG.map((m) => hashString(m.slug) % BODY_PALETTES.length),
    )
    expect(palettes.size).toBeGreaterThan(3)
  })
})
