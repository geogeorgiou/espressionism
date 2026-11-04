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
  await expect(log).toContainText("I can't look up machines yet.")
})
