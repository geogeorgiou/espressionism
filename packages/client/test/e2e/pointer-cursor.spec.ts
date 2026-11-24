import { expect, test } from '@playwright/test'

import { heroNav } from './hero'

// Buttons get the pointer from the base layer in styles.css, which only a
// real browser applies: jsdom never loads the stylesheet.
test.describe('pointer cursor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('the theme switcher and its menu items take the pointer', async ({
    page,
  }) => {
    const trigger = heroNav(page).getByRole('button', {
      name: /^Color theme/,
    })
    await expect(trigger).toHaveCSS('cursor', 'pointer')

    await trigger.click()
    for (const item of await page.getByRole('menuitemradio').all()) {
      await expect(item).toHaveCSS('cursor', 'pointer')
    }
  })

  test('a select and its options take the pointer', async ({ page }) => {
    const drink = page.getByRole('combobox', { name: 'Usual order' })
    await expect(drink).toHaveCSS('cursor', 'pointer')

    await drink.click()
    const options = page.getByRole('option')
    await expect(options.first()).toBeVisible()
    for (const option of await options.all()) {
      await expect(option).toHaveCSS('cursor', 'pointer')
    }
  })

  test("Robospresso's buttons take the pointer, unless disabled", async ({
    page,
  }) => {
    const chat = page.getByRole('region', { name: 'Ask Robospresso' })
    await expect(
      chat.getByRole('button', { name: 'Under €500, please' }),
    ).toHaveCSS('cursor', 'pointer')
    // Nothing to send yet, so Send stays disabled and off the pointer.
    await expect(chat.getByRole('button', { name: 'Send' })).toBeDisabled()
    await expect(chat.getByRole('button', { name: 'Send' })).not.toHaveCSS(
      'cursor',
      'pointer',
    )
  })
})
