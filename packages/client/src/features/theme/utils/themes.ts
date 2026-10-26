/**
 * Color themes. Palettes live in styles.css under `[data-theme='…']`; this
 * file holds the list the switcher shows and the logic that applies one.
 */

export const THEME_IDS = ['system', 'diner', 'tomato', 'night', 'mint'] as const

export type ThemeId = (typeof THEME_IDS)[number]
export type ColorScheme = 'light' | 'dark'

export interface ThemeOption {
  id: ThemeId
  label: string
  /** The sticker's line from the Bitspresso sticker sheet. */
  description: string
  /** Fixed scheme, or null for "follow the OS". */
  scheme: ColorScheme | null
  /** Palette used for the switcher's preview (System previews Diner). */
  preview: PaletteId
  /** Bitspresso's mood on the preview, as on the sticker. */
  mood: 'idle' | 'happy' | 'sleepy' | 'surprised'
}

export const THEMES: readonly ThemeOption[] = [
  {
    id: 'system',
    label: 'System',
    description: 'Diner by day, Night after dark',
    scheme: null,
    preview: 'diner',
    mood: 'idle',
  },
  {
    id: 'diner',
    label: 'Diner',
    description: "Fresh pot's on.",
    scheme: 'light',
    preview: 'diner',
    mood: 'idle',
  },
  {
    id: 'tomato',
    label: 'Tomato',
    description: 'Refill!',
    scheme: 'light',
    preview: 'tomato',
    mood: 'happy',
  },
  {
    id: 'night',
    label: 'Night',
    description: 'Five more minutes',
    scheme: 'dark',
    preview: 'night',
    mood: 'sleepy',
  },
  {
    id: 'mint',
    label: 'Mint',
    description: 'Is that decaf?!',
    scheme: 'light',
    preview: 'mint',
    mood: 'surprised',
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

export type PaletteId = Exclude<ThemeId, 'system'>

/** The palette actually on screen: System resolves to Diner or Night. */
export function resolvePalette(theme: ThemeId, systemDark: boolean): PaletteId {
  if (theme !== 'system') return theme
  return systemDark ? 'night' : 'diner'
}

/** The sticker line for the palette on screen (used by the hero bubble). */
export function stickerLine(palette: PaletteId): string {
  return THEMES.find((t) => t.id === palette)?.description ?? ''
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
