import { useCallback, useEffect, useSyncExternalStore } from 'react'

import type { ColorScheme, PaletteId, ThemeId } from '../utils/themes'
import {
  SYSTEM_DARK_QUERY,
  THEME_STORAGE_KEY,
  applyTheme,
  isThemeId,
  resolvePalette,
  resolveScheme,
} from '../utils/themes'

const listeners = new Set<() => void>()
const notify = () => {
  for (const listener of listeners) listener()
}

/** Used when localStorage is blocked, so a choice still sticks for the visit. */
let memoryTheme: ThemeId = 'system'

function readStoredTheme(): ThemeId {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY)
    return isThemeId(stored) ? stored : 'system'
  } catch {
    return memoryTheme
  }
}

function systemPrefersDark(): boolean {
  return window.matchMedia(SYSTEM_DARK_QUERY).matches
}

function subscribe(onChange: () => void) {
  listeners.add(onChange)
  const media = window.matchMedia(SYSTEM_DARK_QUERY)
  const onStorage = (e: StorageEvent) => {
    if (e.key === THEME_STORAGE_KEY) onChange()
  }
  media.addEventListener('change', onChange)
  window.addEventListener('storage', onStorage)
  return () => {
    listeners.delete(onChange)
    media.removeEventListener('change', onChange)
    window.removeEventListener('storage', onStorage)
  }
}

export interface ThemeState {
  theme: ThemeId
  scheme: ColorScheme
  /** The palette on screen (System resolved to Diner or Night). */
  palette: PaletteId
  isDark: boolean
  setTheme: (theme: ThemeId) => void
}

/**
 * The active color theme, persisted in localStorage and shared across tabs.
 * During SSR it reports "system" / light.
 */
export function useTheme(): ThemeState {
  const theme = useSyncExternalStore(
    subscribe,
    readStoredTheme,
    () => 'system' as const,
  )
  const systemDark = useSyncExternalStore(
    subscribe,
    systemPrefersDark,
    () => false,
  )
  const scheme = resolveScheme(theme, systemDark)

  // Keep <html> in sync with the stored theme (also after OS or tab changes).
  useEffect(() => {
    applyTheme(document.documentElement, theme, systemDark)
  }, [theme, systemDark])

  const setTheme = useCallback((next: ThemeId) => {
    memoryTheme = next
    try {
      if (next === 'system') window.localStorage.removeItem(THEME_STORAGE_KEY)
      else window.localStorage.setItem(THEME_STORAGE_KEY, next)
    } catch {
      /* storage unavailable: the theme still applies for this visit */
    }
    applyTheme(document.documentElement, next, systemPrefersDark())
    notify()
  }, [])

  return {
    theme,
    scheme,
    palette: resolvePalette(theme, systemDark),
    isDark: scheme === 'dark',
    setTheme,
  }
}
