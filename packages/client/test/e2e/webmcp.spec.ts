import type { Page } from '@playwright/test'
import { expect, test } from '@playwright/test'

// Chromium in Playwright ships without WebMCP, so the supported path runs on
// a stub: `document.modelContext.registerTool` keeps each tool on `window`.
async function stubModelContext(page: Page) {
  await page.addInitScript(() => {
    const tools = new Map<string, WebMCP.ModelContextTool>()
    Object.assign(window, { __webmcpTools: tools })
    Object.defineProperty(document, 'modelContext', {
      configurable: true,
      value: {
        registerTool: async (
          tool: WebMCP.ModelContextTool,
          options: WebMCP.ModelContextRegisterToolOptions = {},
        ) => {
          tools.set(tool.name, tool)
          options.signal?.addEventListener('abort', () => {
            if (tools.get(tool.name) === tool) tools.delete(tool.name)
          })
        },
      },
    })
  })
}

function callTool(page: Page, name: string, input: object) {
  return page.evaluate(
    async ([toolName, toolInput]) => {
      const { __webmcpTools: tools } = window as unknown as {
        __webmcpTools: Map<string, WebMCP.ModelContextTool>
      }
      const tool = tools.get(toolName)
      if (!tool) throw new Error(`${toolName} is not registered`)
      return tool.execute(toolInput as Record<string, unknown>, {
        signal: new AbortController().signal,
      })
    },
    [name, input] as const,
  )
}

function banner(page: Page) {
  return page.getByRole('complementary', { name: 'WebMCP' })
}

test('without WebMCP the banner explains how to enable it', async ({
  page,
}) => {
  await page.goto('/')
  await expect(banner(page)).toContainText('Supports WebMCP')
  await expect(
    banner(page).getByRole('link', { name: 'how to enable' }),
  ).toHaveAttribute('href', 'https://developer.chrome.com/docs/ai/webmcp')
})

test.describe('with WebMCP', () => {
  test.beforeEach(async ({ page }) => {
    await stubModelContext(page)
    await page.goto('/')
  })

  test('the banner counts the calculator tool', async ({ page }) => {
    await expect(banner(page)).toContainText(
      'WebMCP on: 1 tool ready for your agent',
    )
  })

  test('fill_calculator fills the form and returns the result', async ({
    page,
  }) => {
    await expect(banner(page)).toContainText('1 tool ready')

    const result = await callTool(page, 'fill_calculator', { cupsPerDay: 2 })
    expect(result).toMatchObject({
      ok: true,
      values: { cupsPerDay: 2 },
      verdict: expect.any(String),
      message: expect.stringContaining('€'),
    })

    await expect(page.getByLabel('Cups a day')).toHaveValue('2')
    await expect(page.getByText('Filled by your agent')).toBeVisible()
    await expect(page).toHaveURL(/cupsPerDay=2/)
  })

  test('fill_calculator rejects invalid input and leaves the form alone', async ({
    page,
  }) => {
    await expect(banner(page)).toContainText('1 tool ready')

    const result = await callTool(page, 'fill_calculator', { daysPerWeek: 9 })
    expect(result).toEqual({
      ok: false,
      errors: [{ field: 'daysPerWeek', message: 'A week has seven days' }],
    })
    await expect(page.getByLabel('Days a week')).toHaveValue('5')
    await expect(page.getByText('Filled by your agent')).toHaveCount(0)
  })
})
