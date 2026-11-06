import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

const BEST_RATED = [
  'Gaggia Touch Lux',
  'Breville Evo 2',
  'Lelit Aurora Plus',
  "De'Longhi Duetto 2",
  'Lelit Duetto Mini',
  'Breville Dual',
  'Rancilio Barista Plus',
  'Sage Bolt Lux',
  'Philips Evo',
  'Sage Evo 2',
]

const CHEAPEST_FIRST = [
  'Rancilio Barista Plus',
  'Philips Evo',
  'Sage Bolt Lux',
  'Sage Evo 2',
  'Lelit Aurora Plus',
  'Breville Dual',
  'Lelit Duetto Mini',
  "De'Longhi Duetto 2",
  'Gaggia Touch Lux',
  'Breville Evo 2',
]

function machines(page: Page) {
  return page
    .getByRole('list', { name: 'Machines' })
    .getByRole('heading', { level: 2 })
}

async function choose(page: Page, label: string, option: string) {
  await page.getByRole('combobox', { name: label }).click()
  await page.getByRole('option', { name: option }).click()
}

test.describe('store', () => {
  test('lists every machine, best rated first, unrated last', async ({
    page,
  }) => {
    await page.goto('/store')
    await expect(
      page.getByRole('heading', { level: 1, name: 'The machine shop' }),
    ).toBeVisible()
    await expect(
      page.getByText('Demo store: prices and ratings are made up'),
    ).toBeVisible()
    await expect(page.getByText('10 of 10 machines')).toBeVisible()
    await expect(machines(page)).toHaveText(BEST_RATED)

    const unrated = page.getByRole('link', { name: /Sage Evo 2/ })
    await expect(unrated).toContainText('No ratings yet')
    await expect(unrated).toContainText('€689')
  })

  test('shows the compact header, not the landing hero', async ({ page }) => {
    await page.goto('/store')
    await expect(
      page.getByRole('link', { name: 'Espressionism' }),
    ).toBeVisible()
    await expect(
      page.getByText('Café every day, or a machine at home?'),
    ).toHaveCount(0)
    await expect(page.getByRole('navigation', { name: 'Main' })).toHaveCount(0)
  })

  test('sorts by price both ways and back to best rated', async ({ page }) => {
    await page.goto('/store')

    await choose(page, 'Sort by', 'Price: low to high')
    await expect(machines(page)).toHaveText(CHEAPEST_FIRST)
    await expect(page).toHaveURL(/sort=price_asc/)

    await choose(page, 'Sort by', 'Price: high to low')
    await expect(machines(page)).toHaveText(CHEAPEST_FIRST.toReversed())
    await expect(page).toHaveURL(/sort=price_desc/)

    await choose(page, 'Sort by', 'Best rated')
    await expect(machines(page)).toHaveText(BEST_RATED)
    await expect(page).not.toHaveURL(/sort=/)
  })

  test('filters by an inclusive price range', async ({ page }) => {
    await page.goto('/store')
    await page.getByLabel('Min price').fill('300')
    await page.getByLabel('Max price').fill('1000')

    await expect(machines(page)).toHaveText([
      'Lelit Aurora Plus',
      'Breville Dual',
      'Sage Bolt Lux',
      'Philips Evo',
      'Sage Evo 2',
    ])
    await expect(page.getByText('5 of 10 machines')).toBeVisible()
    await expect(page).toHaveURL(/minPrice=300/)
    await expect(page).toHaveURL(/maxPrice=1000/)

    await page.getByLabel('Min price').fill('359')
    await page.getByLabel('Max price').fill('369')
    await expect(machines(page)).toHaveText(['Sage Bolt Lux', 'Philips Evo'])
  })

  test('filters by minimum rating and hides unrated machines', async ({
    page,
  }) => {
    await page.goto('/store')
    await choose(page, 'Rating', '4★ and up')

    await expect(machines(page)).toHaveText([
      'Gaggia Touch Lux',
      'Breville Evo 2',
      'Lelit Aurora Plus',
    ])
    await expect(page).toHaveURL(/minRating=4/)

    await choose(page, 'Rating', '3★ and up')
    await expect(machines(page)).toHaveCount(9)
    await expect(machines(page)).not.toContainText(['Sage Evo 2'])
  })

  test('refuses a max price below the min and keeps the last results', async ({
    page,
  }) => {
    await page.goto('/store')
    await page.getByLabel('Min price').fill('500')
    await expect(page).toHaveURL(/minPrice=500/)
    await expect(machines(page)).toHaveCount(7)

    await page.getByLabel('Max price').fill('400')
    await expect(
      page.getByRole('alert').filter({
        hasText: "Max price can't be below min price",
      }),
    ).toBeVisible()
    await expect(machines(page)).toHaveCount(7)
    await expect(page).not.toHaveURL(/maxPrice/)
  })

  test('shows an empty state that resets the filters', async ({ page }) => {
    await page.goto('/store?minPrice=1400')
    await expect(page.getByText('No machines match')).toBeVisible()
    await expect(page.getByText('0 of 10 machines')).toBeVisible()

    await page.getByRole('button', { name: 'Show all machines' }).click()
    await expect(machines(page)).toHaveText(BEST_RATED)
    await expect(page).toHaveURL(/\/store$/)
    await expect(page.getByLabel('Min price')).toHaveValue('')
  })

  test('keeps the filters on reload', async ({ page }) => {
    await page.goto('/store')
    await page.getByLabel('Max price').fill('900')
    await choose(page, 'Sort by', 'Price: high to low')
    await expect(page).toHaveURL(/sort=price_desc/)

    await page.reload()
    await expect(page.getByLabel('Max price')).toHaveValue('900')
    await expect(page.getByRole('combobox', { name: 'Sort by' })).toHaveText(
      'Price: high to low',
    )
    await expect(machines(page)).toHaveText([
      'Lelit Aurora Plus',
      'Sage Evo 2',
      'Sage Bolt Lux',
      'Philips Evo',
      'Rancilio Barista Plus',
    ])
  })

  test('opens a product page and comes back to the same filters', async ({
    page,
  }) => {
    await page.goto('/store')
    await choose(page, 'Rating', '4★ and up')
    await expect(machines(page)).toHaveCount(3)

    await page.getByRole('link', { name: /Gaggia Touch Lux/ }).click()
    await expect(page).toHaveURL(/\/store\/gaggia-touch-lux\?minRating=4$/)
    const product = page.getByRole('article', { name: 'Gaggia Touch Lux' })
    await expect(product).toContainText('Gaggia')
    await expect(product).toContainText('€1,209')
    await expect(product).toContainText('4.7')

    await page.getByRole('link', { name: 'Back to store' }).click()
    await expect(page).toHaveURL(/\/store\?minRating=4$/)
    await expect(page.getByRole('combobox', { name: 'Rating' })).toHaveText(
      '4★ and up',
    )
    await expect(machines(page)).toHaveCount(3)
  })

  test('shows a not-found screen for an unknown product', async ({ page }) => {
    await page.goto('/store/no-such-machine?minRating=4')
    await expect(page).toHaveURL(/\/store\/no-such-machine\?minRating=4$/)
    await expect(
      page.getByRole('heading', { level: 1, name: 'Machine not found' }),
    ).toBeVisible()
    await expect(page.getByText('no-such-machine')).toBeVisible()

    await page.getByRole('link', { name: 'Back to store' }).click()
    await expect(page).toHaveURL(/\/store\?minRating=4$/)
    await expect(machines(page)).toHaveCount(3)
  })
})
