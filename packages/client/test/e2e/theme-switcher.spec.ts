import { expect, test } from '@playwright/test'

import { heroCard, heroNav } from './hero'

// Each theme's sticker line, as Bitspresso says it in the hero bubble.
const THEME_LINES = [
  { theme: 'Diner', line: "Fresh pot's on." },
  { theme: 'Tomato', line: 'Refill!' },
  { theme: 'Night', line: 'Five more minutes' },
  { theme: 'Mint', line: 'Is that decaf?!' },
] as const

test.describe('theme switcher', () => {
  for (const { theme, line } of THEME_LINES) {
    test(`${theme} makes Bitspresso say "${line}"`, async ({ page }) => {
      // Start on System with the other palette, so every pick changes the line.
      const startDark = theme === 'Diner'
      await page.emulateMedia({ colorScheme: startDark ? 'dark' : 'light' })
      await page.goto('/')
      await expect(
        heroCard(page).getByText(
          startDark ? 'Five more minutes' : "Fresh pot's on.",
          { exact: true },
        ),
      ).toBeVisible()

      await heroNav(page)
        .getByRole('button', { name: /^Color theme/ })
        .click()
      await page
        .getByRole('menuitemradio', { name: new RegExp(`^${theme}`) })
        .click()

      await expect(
        heroCard(page).getByText(line, { exact: true }),
      ).toBeVisible()
    })
  }
})
