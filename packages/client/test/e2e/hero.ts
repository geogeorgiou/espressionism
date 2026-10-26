import type { Page } from '@playwright/test'

// Role queries skip hidden elements, so at laptop width the only `banner` is
// the landing hero (the compact phone header is `display: none`).

/** The hero's header nav: Calculator, Charts, Start calculating. */
export function heroNav(page: Page) {
  return page.getByRole('banner').getByRole('navigation', { name: 'Main' })
}

/** The hero's main block: headline, call-to-action links and Bitspresso. */
export function heroBody(page: Page) {
  return page
    .getByRole('banner')
    .locator(':scope > div')
    .filter({ has: page.getByRole('heading', { level: 1 }) })
}

/** Bitspresso's card, with the speech bubble. */
export function heroCard(page: Page) {
  return heroBody(page).getByRole('figure')
}
