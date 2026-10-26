import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import {
  THEME_IDS,
  THEME_STORAGE_KEY,
  SYSTEM_DARK_QUERY,
  THEMES,
  applyTheme,
  initThemeBeforePaint,
  isThemeId,
  resolvePalette,
  resolveScheme,
  stickerLine,
} from '@/features/theme/utils/themes'

import { stubMatchMedia } from '../match-media'

function reset() {
  const root = document.documentElement
  root.removeAttribute('data-theme')
  root.removeAttribute('data-scheme')
  root.style.colorScheme = ''
  window.localStorage.clear()
}

function runInit() {
  initThemeBeforePaint(
    THEME_IDS,
    THEMES.filter((t) => t.scheme === 'dark').map((t) => t.id),
    THEME_STORAGE_KEY,
    SYSTEM_DARK_QUERY,
  )
}

describe('themes', () => {
  beforeEach(reset)
  afterEach(() => {
    reset()
    vi.unstubAllGlobals()
  })

  it('knows its theme ids', () => {
    expect(isThemeId('night')).toBe(true)
    expect(isThemeId('neon')).toBe(false)
    expect(isThemeId(null)).toBe(false)
  })

  it('resolves fixed themes and follows the OS for system', () => {
    expect(resolveScheme('tomato', true)).toBe('light')
    expect(resolveScheme('night', false)).toBe('dark')
    expect(resolveScheme('system', true)).toBe('dark')
    expect(resolveScheme('system', false)).toBe('light')
  })

  it('applies a theme to <html> and clears it for system', () => {
    const root = document.documentElement
    applyTheme(root, 'mint', true)
    expect(root.getAttribute('data-theme')).toBe('mint')
    expect(root.getAttribute('data-scheme')).toBe('light')

    applyTheme(root, 'system', true)
    expect(root.hasAttribute('data-theme')).toBe(false)
    expect(root.getAttribute('data-scheme')).toBe('dark')
  })

  it('init script restores a saved theme before paint', () => {
    stubMatchMedia(false)
    window.localStorage.setItem(THEME_STORAGE_KEY, 'night')
    runInit()
    const root = document.documentElement
    expect(root.getAttribute('data-theme')).toBe('night')
    expect(root.getAttribute('data-scheme')).toBe('dark')
  })

  it('init script ignores unknown saved values', () => {
    stubMatchMedia(true)
    window.localStorage.setItem(THEME_STORAGE_KEY, 'neon')
    runInit()
    const root = document.documentElement
    expect(root.hasAttribute('data-theme')).toBe(false)
    expect(root.getAttribute('data-scheme')).toBe('dark')
  })

  it('resolves System to Diner or Night and finds the sticker line', () => {
    expect(resolvePalette('system', false)).toBe('diner')
    expect(resolvePalette('system', true)).toBe('night')
    expect(resolvePalette('tomato', true)).toBe('tomato')
    expect(stickerLine('tomato')).toBe('Refill!')
    expect(stickerLine('night')).toBe('Five more minutes')
  })
})
