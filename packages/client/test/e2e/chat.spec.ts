import { expect, test } from '@playwright/test'

test('asks Robospresso a question and gets the placeholder answer', async ({
  page,
}) => {
  await page.goto('/#chat')
  const chat = page.getByRole('region', { name: 'Ask Robospresso' })
  const log = chat.getByRole('log', { name: 'Conversation' })

  await chat.getByLabel('Your question').fill('Machines under €300?')
  await chat.getByRole('button', { name: 'Send' }).click()

  await expect(log).toContainText('You: Machines under €300?')
  await expect(log).toContainText('My magnifier is still in the shop')
})

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('shows the chat status badge on its own row', async ({ page }) => {
    // Not /#chat: its smooth scroll would move the boxes between reads
    await page.goto('/')
    const chat = page.getByRole('region', { name: 'Ask Robospresso' })
    const title = chat.getByRole('heading', { name: 'Ask Robospresso' })
    const badge = chat.getByText(/^(Live|Offline)/)

    await expect(badge).toBeVisible()
    const titleBox = await title.boundingBox()
    const badgeBox = await badge.boundingBox()
    expect(badgeBox!.y).toBeGreaterThan(titleBox!.y + titleBox!.height)
  })
})
