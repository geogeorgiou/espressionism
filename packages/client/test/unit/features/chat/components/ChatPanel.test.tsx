import type { ChatTurn } from '@espressionism/agent/contract'
import { CATALOG } from '@espressionism/store'
import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UIMessageChunk } from 'ai'
import { describe, expect, it } from 'vite-plus/test'

import { ChatPanel } from '@/features/chat/components/ChatPanel'
import { CHAT_ERROR_REPLY, CHAT_GREETING } from '@/features/chat/constants'
import type { RobospressoTransport } from '@/features/chat/utils/messages'
import { toTurns } from '@/features/chat/utils/messages'

function renderChat(transport: RobospressoTransport, live = true) {
  const rootRoute = createRootRoute({
    component: () => <ChatPanel transport={transport} live={live} />,
  })
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  return render(<RouterProvider router={router} />)
}

async function log() {
  return screen.findByRole('log', { name: 'Conversation' })
}

async function lastItem() {
  return within(await log())
    .getAllByRole('listitem')
    .at(-1)?.textContent
}

function sendButton() {
  return screen.getByRole<HTMLButtonElement>('button', { name: 'Send' })
}

function text(delta: string, id = 'text-1'): UIMessageChunk[] {
  return [
    { type: 'text-start', id },
    { type: 'text-delta', id, delta },
    { type: 'text-end', id },
  ]
}

function tool(
  toolCallId: string,
  toolName: string,
  input: unknown,
  output: unknown,
): UIMessageChunk[] {
  return [
    { type: 'tool-input-available', toolCallId, toolName, input },
    { type: 'tool-output-available', toolCallId, output },
  ]
}

type Reply = UIMessageChunk[] | Error

/**
 * A fake agent: answers each question with the next scripted reply, as a
 * UI message stream, and records the turns it was sent. An `Error` reply
 * fails the request; a reply ending in an `error` chunk fails mid-stream.
 */
function fakeAgent(...replies: Reply[]) {
  const calls: ChatTurn[][] = []
  const transport: RobospressoTransport = {
    sendMessages: async ({ messages }) => {
      calls.push(toTurns(messages))
      const reply = replies[Math.min(calls.length - 1, replies.length - 1)]
      if (!reply) throw new Error('no reply scripted')
      if (reply instanceof Error) throw reply
      return new ReadableStream({
        start(controller) {
          for (const chunk of [{ type: 'start' } as const, ...reply]) {
            controller.enqueue(chunk)
          }
          if (reply.at(-1)?.type !== 'error') {
            controller.enqueue({ type: 'finish' })
          }
          controller.close()
        },
      })
    },
    reconnectToStream: async () => null,
  }
  return { calls, transport }
}

const [first, second] = CATALOG

describe('ChatPanel', () => {
  it('shows a live badge when a model is configured', async () => {
    renderChat(fakeAgent(text('Hi')).transport, true)
    const badge = await screen.findByText('Live')
    expect(badge.getAttribute('data-status')).toBe('live')
    expect(screen.queryByText(/Demo mode/)).toBe(null)
  })

  it('says it is offline, with a hint, when no model is configured', async () => {
    renderChat(fakeAgent(text('Hi')).transport, false)
    const badge = await screen.findByText('Offline')
    expect(badge.getAttribute('data-status')).toBe('offline')
    expect(screen.getByText(/Demo mode: connect a model/)).toBeTruthy()
  })

  it('opens with a greeting and nothing to send', async () => {
    renderChat(fakeAgent(text('Hi')).transport)
    expect((await log()).textContent).toContain(CHAT_GREETING)
    expect(sendButton().disabled).toBe(true)
  })

  it('sends a typed question, clears the input and shows the reply', async () => {
    const user = userEvent.setup()
    renderChat(fakeAgent(text('Two machines under €200.')).transport)
    const input =
      await screen.findByLabelText<HTMLInputElement>('Your question')

    await user.type(input, 'Machines under 200?{Enter}')

    await waitFor(async () =>
      expect(await lastItem()).toBe('Robospresso: Two machines under €200.'),
    )
    const items = within(await log()).getAllByRole('listitem')
    expect(items.at(1)?.textContent).toBe('You: Machines under 200?')
    expect(input.value).toBe('')
  })

  it('draws the picks as cards that open their page in a new tab', async () => {
    const user = userEvent.setup()
    renderChat(
      fakeAgent([
        ...text('Two strong picks.'),
        ...tool(
          'c1',
          'show_machines',
          { slugs: [first.slug, second.slug] },
          { ok: true, items: [first, second] },
        ),
      ]).transport,
    )

    await user.type(
      await screen.findByLabelText('Your question'),
      'Picks?{Enter}',
    )

    const cards = await screen.findByRole('list', {
      name: 'Recommended machines',
    })
    const links = within(cards).getAllByRole('link')
    expect(links).toHaveLength(2)
    expect(links[0]?.getAttribute('href')).toBe(`/store/${first.slug}`)
    expect(links[0]?.getAttribute('target')).toBe('_blank')
    expect(links[0]?.getAttribute('rel')).toBe('noopener noreferrer')
    expect(links[0]?.textContent).toContain(first.name)
    expect(links[0]?.textContent).toContain('(opens in new tab)')
  })

  it('links to the store with the search filters', async () => {
    const user = userEvent.setup()
    renderChat(
      fakeAgent([
        ...tool(
          'c1',
          'show_store_link',
          { maxPrice: 500, minRating: 4.2 },
          {
            ok: true,
            filters: { maxPrice: 500, minRating: 4.2 },
            sort: 'rating_desc',
            total: 6,
          },
        ),
      ]).transport,
    )

    await user.type(
      await screen.findByLabelText('Your question'),
      'More?{Enter}',
    )

    const link = await screen.findByRole('link', {
      name: /See all 6 in the store/,
    })
    // The rating select only has 3, 4 and 4.5: 4.2 shows the next one down.
    expect(link.getAttribute('href')).toBe('/store?maxPrice=500&minRating=4')
    expect(link.getAttribute('target')).toBe('_blank')
  })

  it('draws nothing for a display call the model got wrong', async () => {
    const user = userEvent.setup()
    renderChat(
      fakeAgent([
        ...tool(
          'c1',
          'show_machines',
          { slugs: ['nope'] },
          { ok: false, errors: [{ field: 'slugs', message: 'No machine' }] },
        ),
        ...text('Here you go.'),
      ]).transport,
    )

    await user.type(
      await screen.findByLabelText('Your question'),
      'Picks?{Enter}',
    )

    await waitFor(async () =>
      expect(await lastItem()).toBe('Robospresso: Here you go.'),
    )
    expect(screen.queryByRole('list', { name: 'Recommended machines' })).toBe(
      null,
    )
  })

  it('sends text turns only, noting which cards were shown', async () => {
    const user = userEvent.setup()
    const agent = fakeAgent(
      [
        ...tool('s1', 'search_espresso_machines', {}, { ok: true, items: [] }),
        ...text('One pick.'),
        ...tool(
          'c1',
          'show_machines',
          { slugs: [first.slug] },
          { ok: true, items: [first] },
        ),
      ],
      text('Sure.'),
    )
    renderChat(agent.transport)
    const input = await screen.findByLabelText('Your question')

    await user.type(input, 'First{Enter}')
    await screen.findByRole('list', { name: 'Recommended machines' })
    await waitFor(() => expect(sendButton().disabled).toBe(true))
    await user.type(input, 'Tell me more{Enter}')

    await waitFor(() => expect(agent.calls).toHaveLength(2))
    expect(agent.calls.at(1)).toEqual([
      { role: 'user', text: 'First' },
      {
        role: 'assistant',
        text: `One pick.\n[Cards shown: ${first.slug}]`,
      },
      { role: 'user', text: 'Tell me more' },
    ])
  })

  it('sends a suggested question when it is clicked', async () => {
    const user = userEvent.setup()
    renderChat(fakeAgent(text('Ok.')).transport)

    await user.click(
      await screen.findByRole('button', { name: 'Rated over 3 stars' }),
    )

    expect((await log()).textContent).toContain('You: Rated over 3 stars')
    expect(screen.queryByRole('list', { name: 'Suggested questions' })).toBe(
      null,
    )
  })

  it('apologises when the agent fails, and leaves that out of the history', async () => {
    const user = userEvent.setup()
    const agent = fakeAgent(new Error('offline'), text('Back online.'))
    renderChat(agent.transport)
    const input = await screen.findByLabelText('Your question')

    await user.type(input, 'Hello?{Enter}')
    await waitFor(async () =>
      expect(await lastItem()).toBe(`Robospresso: ${CHAT_ERROR_REPLY}`),
    )

    await user.type(input, 'Again{Enter}')
    await waitFor(async () =>
      expect(await lastItem()).toBe('Robospresso: Back online.'),
    )
    expect(agent.calls.at(1)).toEqual([
      { role: 'user', text: 'Hello?' },
      { role: 'user', text: 'Again' },
    ])
    expect((await log()).textContent).not.toContain(CHAT_ERROR_REPLY)
  })

  it('keeps what arrived before a failure mid-answer', async () => {
    const user = userEvent.setup()
    renderChat(
      fakeAgent([
        ...tool(
          'c1',
          'show_machines',
          { slugs: [first.slug] },
          { ok: true, items: [first] },
        ),
        { type: 'error', errorText: 'Robospresso could not answer' },
      ]).transport,
    )

    await user.type(
      await screen.findByLabelText('Your question'),
      'Picks?{Enter}',
    )

    await waitFor(async () =>
      expect(await lastItem()).toBe(`Robospresso: ${CHAT_ERROR_REPLY}`),
    )
    expect(
      screen.getByRole('list', { name: 'Recommended machines' }),
    ).toBeTruthy()
  })

  it('ignores a blank question', async () => {
    const user = userEvent.setup()
    const agent = fakeAgent(text('Ok.'))
    renderChat(agent.transport)

    await user.type(await screen.findByLabelText('Your question'), '   {Enter}')

    expect(within(await log()).getAllByRole('listitem')).toHaveLength(1)
    expect(sendButton().disabled).toBe(true)
    expect(agent.calls).toHaveLength(0)
  })
})
