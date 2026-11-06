/**
 * The store's product picture: one 20×20 espresso machine, drawn like
 * Bitspresso (one letter per pixel, "." is empty). Every machine shares the
 * shape; its slug picks a body color, an accent and a speckle of noise, so
 * each product gets its own look that never changes between visits.
 *
 * Legend:
 *   K outline · T cup-warmer tray · B body · H body shine · S body shade
 *   G gauge face · A accent buttons · D brew recess · M group head
 *   C coffee drip · O cup · R drip tray
 */

import { BASE_COLORS } from '@/features/mascot/utils/sprite'

export interface MachinePixel {
  x: number
  y: number
  fill: string
  opacity: number
}

export const MACHINE_ROWS = [
  '....................',
  '...KKKKKKKKKKKKKK...',
  '...KTTTTTTTTTTTTK...',
  '..KKKKKKKKKKKKKKKK..',
  '..KHBBBBBBBBBBBBSK..',
  '..KHBKKKKBBBBBBBSK..',
  '..KHKGGGGKBBAABBSK..',
  '..KHKGGKGKBBAABBSK..',
  '..KHKGKGGKBBBBBBSK..',
  '..KHBKKKKBBBBBBBSK..',
  '..KHBBBBBBBBBBBBSK..',
  '..KHBBBBBBBBBBBBSK..',
  '..KHBBKKKMMKKKBBSK..',
  '..KHBBKDDKKDDKBBSK..',
  '..KHBBKDDCCDDKBBSK..',
  '..KHBBKDOOOODKBBSK..',
  '..KHBBKDOOOODKBBSK..',
  '..KKKKKKKKKKKKKKKK..',
  '..KRRRRRRRRRRRRRRK..',
  '..KKKKKKKKKKKKKKKK..',
]

/** Body color, its shine and its shade. */
export const BODY_PALETTES = [
  { B: '#c8402f', H: '#e8705c', S: '#8e2a1f' },
  { B: '#e9dcc3', H: '#fff4dc', S: '#b9a98c' },
  { B: '#3b3634', H: '#5c5552', S: '#221f1e' },
  { B: '#b8c0c8', H: '#e3e8ec', S: '#7f8890' },
  { B: '#6fbfa4', H: '#9ee0c8', S: '#3f8a72' },
  { B: '#3f6fb5', H: '#6d97d6', S: '#2a4c80' },
  { B: '#e0b13a', H: '#f5d36e', S: '#a37d1f' },
  { B: '#b8713f', H: '#dc9a64', S: '#7d4a26' },
] as const

export const ACCENTS = ['#e33c3c', '#3cb371', '#f2c14e', '#4aa3df'] as const

const FIXED: Record<string, string> = {
  K: BASE_COLORS.K,
  O: BASE_COLORS.O,
  T: '#9aa5b1',
  M: '#9aa5b1',
  R: '#7f8890',
  G: '#f4efe6',
  D: '#1d1816',
  C: '#3a1f12',
}

/** About one body pixel in seven gets speckled. */
const NOISE_PER_MILLE = 140

/** FNV-1a, 32-bit: a stable number from a string. */
export function hashString(text: string): number {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return hash >>> 0
}

/** Mixes a seed with a pixel position into a fresh 32-bit number. */
function mix(seed: number, x: number, y: number): number {
  let h =
    (seed ^ Math.imul(x + 1, 0x27d4eb2d) ^ Math.imul(y + 1, 0x165667b1)) >>> 0
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d)
  h = Math.imul(h ^ (h >>> 12), 0x297a2d39)
  return (h ^ (h >>> 15)) >>> 0
}

/** Builds a machine's 20×20 picture from its slug. Same slug, same pixels. */
export function buildMachineSprite(slug: string): MachinePixel[] {
  const seed = hashString(slug)
  const body = BODY_PALETTES[seed % BODY_PALETTES.length]
  const accent = ACCENTS[(seed >>> 8) % ACCENTS.length]
  const colors: Record<string, string> = { ...FIXED, ...body, A: accent }

  const pixels: MachinePixel[] = []
  MACHINE_ROWS.forEach((row, y) => {
    row.split('').forEach((ch, x) => {
      let fill = colors[ch]
      if (!fill) return
      if (ch === 'B') {
        const noise = mix(seed, x, y)
        if (noise % 1000 < NOISE_PER_MILLE) {
          fill = noise & 0x10000 ? body.H : body.S
        }
      }
      pixels.push({ x, y, fill, opacity: 1 })
    })
  })
  return pixels
}
