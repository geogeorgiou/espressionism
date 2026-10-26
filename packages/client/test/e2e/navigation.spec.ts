import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

import { heroBody, heroNav } from './hero'

const LINKS = [
  { where: 'header', name: 'Calculator', section: 'calculator' },
  { where: 'header', name: 'Charts', section: 'charts' },
  { where: 'header', name: 'Start calculating', section: 'calculator' },
  { where: 'hero', name: 'Start calculating', section: 'calculator' },
  { where: 'hero', name: 'See the charts', section: 'charts' },
] as const

function scope(page: Page, where: (typeof LINKS)[number]['where']) {
  return where === 'header' ? heroNav(page) : heroBody(page)
}

test.describe('section links', () => {
  for (const link of LINKS) {
    test(`${link.where} "${link.name}" jumps to #${link.section}`, async ({
      page,
    }) => {
      await page.goto('/')
      const target = page.locator(`#${link.section}`)
      await expect(target).not.toBeInViewport()

      await scope(page, link.where)
        .getByRole('link', { name: link.name })
        .click()

      await expect(page).toHaveURL(new RegExp(`#${link.section}$`))
      await expect(target).toBeInViewport()
    })
  }
})
