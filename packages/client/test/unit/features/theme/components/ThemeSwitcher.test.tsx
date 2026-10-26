import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vite-plus/test'

import { ThemeSwitcher } from '@/features/theme/components/ThemeSwitcher'
import { THEME_STORAGE_KEY } from '@/features/theme/utils/themes'

import { stubMatchMedia } from '../match-media'

describe('ThemeSwitcher', () => {
  beforeEach(() => {
    stubMatchMedia(false)
    window.localStorage.clear()
  })
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme')
    window.localStorage.clear()
    vi.unstubAllGlobals()
  })

  it('switches to the chosen theme and remembers it', async () => {
    const user = userEvent.setup()
    render(<ThemeSwitcher />)

    const trigger = screen.getByRole('button', { name: 'Color theme: System' })
    await user.click(trigger)
    await user.click(
      await screen.findByRole('menuitemradio', { name: /^Night/ }),
    )

    await waitFor(() =>
      expect(document.documentElement.getAttribute('data-theme')).toBe('night'),
    )
    expect(document.documentElement.getAttribute('data-scheme')).toBe('dark')
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('night')
    expect(
      screen.getByRole('button', { name: 'Color theme: Night' }),
    ).toBeTruthy()
  })

  it('going back to System clears the saved choice', async () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'tomato')
    const user = userEvent.setup()
    render(<ThemeSwitcher />)

    await user.click(
      screen.getByRole('button', { name: 'Color theme: Tomato' }),
    )
    await user.click(
      await screen.findByRole('menuitemradio', { name: /^System/ }),
    )

    await waitFor(() =>
      expect(document.documentElement.hasAttribute('data-theme')).toBe(false),
    )
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull()
  })
})
