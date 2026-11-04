/**
 * Robospresso: Bitspresso's cousin who runs the chat. An espresso-machine
 * robot with aviator shades, a handlebar mustache, an antenna light and a
 * cup under the spout. While a request is in flight he scans with a
 * magnifying glass.
 *
 * One 20×20 text sprite, one letter per pixel, "." is empty. Body colors
 * follow the active theme through the same --mug-* properties as Bitspresso;
 * the panel band and the coffee drip follow the flavor; the magnifying glass
 * keeps fixed colors so it reads on every theme.
 *
 * Legend:
 *   K outline · W body · H shine · S shade · D trim · O cup
 *   G shades · U mustache · A antenna light · B panel band · N band shade
 *   C coffee drip
 */

import type { MascotFlavor } from './sprite'
import { BASE_COLORS, FLAVOR_COLORS } from './sprite'

export const ROBOT_MOODS = ['cool', 'searching'] as const
export type RobotMood = (typeof ROBOT_MOODS)[number]

/** Which part of the drawing a pixel belongs to, so renderers can animate it. */
export type RobotPart = 'body' | 'antenna' | 'magnifier'

export interface RobotPixel {
  x: number
  y: number
  fill: string
  opacity: number
  part: RobotPart
}

const ROWS = [
  '....................',
  '.........AA.........',
  '.........AA.........',
  '.........KK.........',
  '...KKKKKKKKKKKKKK...',
  '..KHWWWWWWWWWWWWSK..',
  '.KKHGGGGGGGGGGGGSKK.',
  '.KDHGHGGGWWGHGGGSDK.',
  '.KKHWGGGWWWWGGGWSKK.',
  '..KHWWWWWWWWWWWWSK..',
  '..KHUWWWWWWWWWWUSK..',
  '..KHUUUUUWWUUUUUSK..',
  '..KHWWUUUUUUUUWWSK..',
  '..KBBBABBBBBBBBNNK..',
  '..KSSSSSSSSSSSSSSK..',
  '...KKKKKKKKKKKKKK...',
  '.......KDDDDK.......',
  '.........C..........',
  '......KOOOOOOK......',
  '.......KKKKKK.......',
]

/** Rows of the antenna light, which blinks while searching. */
const ANTENNA_ROWS = new Set([1, 2])

/**
 * The magnifying glass, drawn at its resting spot over the right lens.
 * K frame · H glint · T lens · S handle
 */
const MAGNIFIER = [
  '.KKKK...',
  'KHTTTK..',
  'KTTTTK..',
  'KTTTTK..',
  'KTTTTK..',
  '.KKKKS..',
  '.....SS.',
  '......SS',
]
export const MAGNIFIER_ORIGIN = { x: 12, y: 5 }
/** How far left the glass sweeps, in pixels, to reach the left lens. */
export const MAGNIFIER_SWEEP = 9

export const MAGNIFIER_COLORS: Record<
  string,
  { fill: string; opacity: number }
> = {
  K: { fill: '#9aa5b1', opacity: 1 },
  H: { fill: '#ffffff', opacity: 1 },
  T: { fill: '#bfe6ff', opacity: 0.45 },
  S: { fill: '#b0703c', opacity: 1 },
}

/** Builds the full 20×20 frame as a flat list of lit pixels. */
export function buildRobospresso(
  mood: RobotMood,
  flavor: MascotFlavor = 'house',
): RobotPixel[] {
  const { B, N, C } = FLAVOR_COLORS[flavor]
  const colors: Record<string, string> = {
    K: BASE_COLORS.K,
    W: BASE_COLORS.W,
    H: BASE_COLORS.H,
    S: BASE_COLORS.S,
    D: BASE_COLORS.D,
    O: BASE_COLORS.O,
    G: BASE_COLORS.K,
    U: BASE_COLORS.K,
    A: BASE_COLORS.R,
    B,
    N,
    C,
  }

  const pixels: RobotPixel[] = []
  ROWS.forEach((row, y) => {
    row.split('').forEach((ch, x) => {
      const fill = colors[ch]
      if (!fill) return
      const part = ch === 'A' && ANTENNA_ROWS.has(y) ? 'antenna' : 'body'
      pixels.push({ x, y, fill, opacity: 1, part })
    })
  })

  if (mood === 'searching') {
    MAGNIFIER.forEach((row, dy) => {
      row.split('').forEach((ch, dx) => {
        const color = MAGNIFIER_COLORS[ch]
        if (!color) return
        pixels.push({
          x: MAGNIFIER_ORIGIN.x + dx,
          y: MAGNIFIER_ORIGIN.y + dy,
          ...color,
          part: 'magnifier',
        })
      })
    })
  }

  return pixels
}
