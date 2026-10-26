/**
 * Color themes. Palettes live in styles.css under `[data-theme='…']`; this
 * file holds the list the switcher shows and the logic that applies one.
 */

export const THEME_IDS = [
  'system',
  'diner',
  'espresso',
  'tomato',
  'mint',
  'night',
] as const

export type ThemeId = (typeof THEME_IDS)[number]
export type ColorScheme = 'light' | 'dark'

export interface ThemeOption {
  id: ThemeId
  label: string
  description: string
  /** Fixed scheme, or null for "follow the OS". */
  scheme: ColorScheme | null
  /** Page, accent and screen colors, for the switcher's swatch. */
  swatch: readonly [string, string, string]
}

export const THEMES: readonly ThemeOption[] = [
  {
    id: 'system',
    label: 'System',
    description: 'Diner by day, Espresso by night',
    scheme: null,
    swatch: ['#e7eceb', '#0f6f68', '#171412'],
  },
  {
    id: 'diner',
    label: 'Diner',
    description: 'Cream and teal',
    scheme: 'light',
    swatch: ['#e7eceb', '#0f6f68', '#2a2220'],
  },
  {
    id: 'espresso',
    label: 'Espresso',
    description: 'Dark roast',
    scheme: 'dark',
    swatch: ['#171412', '#4fc1b4', '#d9a066'],
  },
  {
    id: 'tomato',
    label: 'Tomato',
    description: 'Red mug, teal screen',
    scheme: 'light',
    swatch: ['#f5e9e4', '#b7362b', '#0f6f68'],
  },
  {
    id: 'mint',
    label: 'Mint',
    description: 'Fresh and pale',
    scheme: 'light',
    swatch: ['#e4f2ec', '#2b7a62', '#22302b'],
  },
  {
    id: 'night',
    label: 'Night',
    description: 'Navy late shift',
    scheme: 'dark',
    swatch: ['#10141f', '#8fb0e6', '#e48aa0'],
  },
]

export const THEME_STORAGE_KEY = 'espressionism-theme'
export const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)'

export function isThemeId(value: unknown): value is ThemeId {
  return (
    typeof value === 'string' &&
    (THEME_IDS as readonly string[]).includes(value)
  )
}

export function resolveScheme(
  theme: ThemeId,
  systemDark: boolean,
): ColorScheme {
  const fixed = THEMES.find((t) => t.id === theme)?.scheme
  return fixed ?? (systemDark ? 'dark' : 'light')
}

/** Sets `data-theme` (absent for system) and `data-scheme` on <html>. */
export function applyTheme(
  root: HTMLElement,
  theme: ThemeId,
  systemDark: boolean,
) {
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
  const scheme = resolveScheme(theme, systemDark)
  root.setAttribute('data-scheme', scheme)
  root.style.colorScheme = scheme
}

/**
 * Applies the saved theme before first paint. It is serialized into an inline
 * <head> script (THEME_INIT_SCRIPT), so it must stay self-contained: no
 * imports or outer variables, only its arguments. Mirrors `applyTheme`.
 */
export function initThemeBeforePaint(
  ids: readonly string[],
  darkThemes: readonly string[],
  storageKey: string,
  darkQuery: string,
) {
  try {
    let theme = 'system'
    try {
      const stored = window.localStorage.getItem(storageKey)
      if (stored && ids.includes(stored)) theme = stored
    } catch {
      /* storage blocked: stay on system */
    }
    const dark =
      theme === 'system'
        ? window.matchMedia(darkQuery).matches
        : darkThemes.includes(theme)
    const root = document.documentElement
    if (theme !== 'system') root.setAttribute('data-theme', theme)
    root.setAttribute('data-scheme', dark ? 'dark' : 'light')
    root.style.colorScheme = dark ? 'dark' : 'light'
  } catch {
    /* never block the page over a theme */
  }
}

const DARK_THEMES = THEMES.filter((t) => t.scheme === 'dark').map((t) => t.id)

export const THEME_INIT_SCRIPT = `(${initThemeBeforePaint.toString()})(${[
  THEME_IDS,
  DARK_THEMES,
  THEME_STORAGE_KEY,
  SYSTEM_DARK_QUERY,
]
  .map((arg) => JSON.stringify(arg))
  .join(',')})`
