import { expect, test } from '@playwright/test'

import { heroBody, heroCard, heroNav } from './hero'

test.describe('landing hero', () => {
  test('shows Bitspresso with the Diner line in light mode', async ({
    page,
  }) => {
    await page.goto('/')

    const card = heroCard(page)
    await expect(
      card.getByRole('img', { name: 'Bitspresso, house mug, happy' }),
    ).toBeVisible()
    await expect(card.getByText('Bitspresso', { exact: true })).toBeVisible()
    await expect(card.getByText("Fresh pot's on.")).toBeVisible()
  })

  test('shows the Night line in dark mode', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/')

    await expect(heroCard(page).getByText('Five more minutes')).toBeVisible()
  })

  test('shows the Charts and Start calculating actions', async ({ page }) => {
    await page.goto('/')

    const nav = heroNav(page)
    await expect(nav.getByRole('link', { name: 'Charts' })).toBeVisible()
    await expect(
      nav.getByRole('link', { name: 'Start calculating' }),
    ).toBeVisible()
    await expect(
      heroBody(page).getByRole('link', { name: 'Start calculating' }),
    ).toBeVisible()
  })
})
