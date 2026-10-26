/**
 * Bitspresso: an 8-bit coffee mascot with two forms (a diner mug "for here" and
 * a takeaway cup "to go"), five moods and five flavors.
 *
 * Each form is a text sprite: one letter per pixel, "." is empty.
 * Both forms share the same cream body and the same face, stamped at the same
 * spot, with the flavor color right under the face (a painted band on the mug,
 * a paper sleeve on the cup).
 *
 * Body colors come from the active theme (see MUG_COLOR_VARS); the flavor
 * band, coffee and foam come from the drink (FLAVOR_COLORS).
 *
 * Legend:
 *   K outline · W body · H shine · S shade · B flavor band · N band shade
 *   C coffee · F foam · L lid · D lid rim · O saucer
 *   E eyes · P cheeks · M mouth · R tongue · V steam
 */

export const GRID_SIZE = 20

export const MASCOT_FORMS = ['mug', 'togo'] as const
export const MASCOT_MOODS = [
  'idle',
  'happy',
  'sleepy',
  'surprised',
  'wink',
] as const
export const MASCOT_FLAVORS = [
  'house',
  'latte',
  'mocha',
  'matcha',
  'cherry',
] as const

export type MascotForm = (typeof MASCOT_FORMS)[number]
export type MascotMood = (typeof MASCOT_MOODS)[number]
export type MascotFlavor = (typeof MASCOT_FLAVORS)[number]

/** Which part of the drawing a pixel belongs to, so renderers can animate it. */
export type MascotPart = 'body' | 'steam' | 'z'

export interface MascotPixel {
  x: number
  y: number
  fill: string
  opacity: number
  part: MascotPart
  /** For steam: which wisp (0 = leftmost) the pixel belongs to. */
  wisp?: number
}

interface FormSpec {
  /** Left edge of the face kit (the left cheek). */
  faceX: number
  /** Columns the steam wisps rise from. */
  steam: number[]
  rows: string[]
}

const FORMS: Record<MascotForm, FormSpec> = {
  mug: {
    faceX: 3,
    steam: [5, 8, 11],
    rows: [
      '.KKKKKKKKKKKKKK.....',
      '.KCCFFCCCCFFCCK.....',
      '.KWWWWWWWWWWWWKKKK..',
      '.KHWWWWWWWWWWSK...K.',
      '.KHWWWWWWWWWWSK...K.',
      '.KHWWWWWWWWWWSK...K.',
      '.KHWWWWWWWWWWSK...K.',
      '.KHWWWWWWWWWWSK..K..',
      '.KHWWWWWWWWWWSKKK...',
      '.KBBBBBBBBBBBNK.....',
      '.KBBBBBBBBBBBNK.....',
      '..KSSSSSSSSSSK......',
      '...KKKKKKKKKK.......',
      'KOOOOOOOOOOOOOOK....',
      '.KKKKKKKKKKKKKK.....',
    ],
  },
  togo: {
    faceX: 5,
    steam: [8, 11],
    rows: [
      '....KKKKKKKKKKKK....',
      '...KLLLLLLLLLLLLK...',
      '..KDDDDDDDDDDDDDDK..',
      '...KHWWWWWWWWWWSK...',
      '...KHWWWWWWWWWWSK...',
      '...KHWWWWWWWWWWSK...',
      '...KHWWWWWWWWWWSK...',
      '...KHWWWWWWWWWWSK...',
      '...KBBBBBBBBBBBNK...',
      '...KBBBBBBBBBBBNK...',
      '...KBBBBBBBBBBBNK...',
      '....KHWWWWWWWWSK....',
      '....KHWWWWWWWWSK....',
      '.....KKKKKKKKKK.....',
      '....................',
    ],
  },
}

/**
 * Mug colors follow the active color theme. Each letter reads a CSS custom
 * property (set per theme in styles.css) and falls back to the Diner mug, so
 * the sprite still renders outside a themed page (favicons, tests).
 */
export const MUG_COLOR_VARS: Record<string, { name: string; diner: string }> = {
  K: { name: '--mug-outline', diner: '#2a1810' },
  W: { name: '--mug-body', diner: '#f4ead8' },
  H: { name: '--mug-shine', diner: '#ffffff' },
  S: { name: '--mug-shade', diner: '#cdb592' },
  L: { name: '--mug-lid', diner: '#ffffff' },
  D: { name: '--mug-lid-rim', diner: '#d9cdb8' },
  O: { name: '--mug-saucer', diner: '#e2d3b8' },
  E: { name: '--mug-eyes', diner: '#2a1810' },
  M: { name: '--mug-mouth', diner: '#2a1810' },
  R: { name: '--mug-tongue', diner: '#e0574f' },
  P: { name: '--mug-cheeks', diner: '#f08c8c' },
  V: { name: '--mug-steam', diner: '#ffffff' },
}

const BASE_COLORS: Record<string, string> = Object.fromEntries(
  Object.entries(MUG_COLOR_VARS).map(([letter, { name, diner }]) => [
    letter,
    `var(${name}, ${diner})`,
  ]),
)

export const FLAVOR_COLORS: Record<
  MascotFlavor,
  { B: string; N: string; C: string; F: string }
> = {
  house: {
    B: '#0f6f68',
    N: '#0a4f4a',
    C: '#3a1f12',
    F: '#8a5232',
  },
  latte: {
    B: '#d6a46a',
    N: '#a8774f',
    C: '#b07a4a',
    F: '#fbf3e4',
  },
  mocha: {
    B: '#6b3b22',
    N: '#4a2614',
    C: '#4a2614',
    F: '#d6a46a',
  },
  matcha: {
    B: '#7fae5a',
    N: '#5a8a3e',
    C: '#8fbf6a',
    F: '#d9ecc4',
  },
  cherry: {
    B: '#d8473a',
    N: '#a3302a',
    C: '#5b3420',
    F: '#d9a066',
  },
}

/** Rows above the sprite are left free for steam or the sleepy "Z". */
const SPRITE_TOP = 5
const FACE_TOP = 4
const STEAM_WAVE = [0, 1, 0, -1]

/** Returns the sprite rows (as letters) with the mood's face stamped on. */
export function stampFace(form: MascotForm, mood: MascotMood): string[][] {
  const { faceX, rows } = FORMS[form]
  const grid = rows.map((row) => row.split(''))
  const set = (dx: number, dy: number, ch: string) => {
    grid[FACE_TOP + dy][faceX + dx] = ch
  }
  const eyeOpen = (dx: number) => {
    set(dx, 0, 'E')
    set(dx + 1, 0, 'E')
    set(dx, 1, 'E')
    set(dx + 1, 1, 'E')
  }
  const eyeShut = (dx: number) => {
    set(dx, 1, 'E')
    set(dx + 1, 1, 'E')
  }
  const eyeSquint = (dx: number) => {
    set(dx, 0, 'E')
    set(dx + 1, 0, 'E')
  }
  const smile = () => {
    set(3, 2, 'M')
    set(6, 2, 'M')
    set(4, 3, 'M')
    set(5, 3, 'M')
  }
  const cheeks = () => {
    set(0, 2, 'P')
    set(9, 2, 'P')
  }

  switch (mood) {
    case 'idle': {
      eyeOpen(1)
      eyeOpen(7)
      smile()
      cheeks()
      break
    }
    case 'happy': {
      eyeSquint(1)
      eyeSquint(7)
      cheeks()
      for (const dx of [3, 4, 5, 6]) set(dx, 2, 'M')
      set(4, 3, 'R')
      set(5, 3, 'R')
      break
    }
    case 'sleepy': {
      eyeShut(1)
      eyeShut(7)
      set(4, 3, 'M')
      set(5, 3, 'M')
      cheeks()
      break
    }
    case 'surprised': {
      eyeOpen(1)
      eyeOpen(7)
      for (const dx of [1, 2, 7, 8]) set(dx, -1, 'K')
      for (const dx of [4, 5]) {
        set(dx, 2, 'M')
        set(dx, 3, 'M')
      }
      break
    }
    case 'wink': {
      eyeShut(1)
      eyeOpen(7)
      smile()
      cheeks()
      break
    }
  }
  return grid
}

/** Builds the full 20×20 frame as a flat list of lit pixels. */
export function buildMascot(
  form: MascotForm,
  mood: MascotMood,
  flavor: MascotFlavor,
): MascotPixel[] {
  const colors: Record<string, string> = {
    ...BASE_COLORS,
    ...FLAVOR_COLORS[flavor],
  }
  const pixels = new Map<string, MascotPixel>()
  const put = (
    x: number,
    y: number,
    fill: string,
    opacity = 1,
    part: MascotPart = 'body',
    wisp?: number,
  ) => {
    pixels.set(`${x},${y}`, { x, y, fill, opacity, part, wisp })
  }

  stampFace(form, mood).forEach((row, y) => {
    row.forEach((ch, x) => {
      const fill = colors[ch]
      if (fill) put(x, SPRITE_TOP + y, fill)
    })
  })

  if (mood === 'sleepy') {
    const z = ['VVV', '.V.', 'VVV']
    z.forEach((row, y) => {
      row.split('').forEach((ch, x) => {
        if (ch === 'V') put(15 + x, 1 + y, colors.V, 0.85, 'z')
      })
    })
  } else {
    FORMS[form].steam.forEach((baseX, i) => {
      for (let r = 0; r < 4; r++) {
        const x = baseX + STEAM_WAVE[(r + i) % STEAM_WAVE.length]
        put(x, 1 + r, colors.V, 0.2 + r * 0.18, 'steam', i)
      }
    })
  }

  return [...pixels.values()]
}
