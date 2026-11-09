import type { ChatRequest } from '@espressionism/agent/contract'
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
import {
  CHAT_ERROR_REPLY,
  CHAT_GREETING,
  CHAT_RESTARTED_NOTE,
} from '@/features/chat/constants'
import type { RobospressoTransport } from '@/features/chat/utils/messages'
import { chatRequest } from '@/features/chat/utils/messages'

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

const SESSION = '5f0c3a1e-8b7d-4c2a-9e61-2b4d6f8a0c11'
const NEW_SESSION = '7a2e9c4b-1d3f-4e5a-8b6c-0f9e8d7c6b5a'

/** The agent's opening part: the session this answer was recorded in. */
function session(id: string, restarted = false): UIMessageChunk[] {
  return [{ type: 'data-session', data: { id, restarted }, transient: true }]
}

type Reply = UIMessageChunk[] | Error

/**
 * A fake agent: answers each question with the next scripted reply, as a
 * UI message stream, and records what each request carried. An `Error`
 * reply fails the request; a reply ending in an `error` chunk fails
 * mid-stream.
 */
function fakeAgent(...replies: Reply[]) {
  const calls: ChatRequest[] = []
  const transport: RobospressoTransport = {
    sendMessages: async ({ messages, body }) => {
      calls.push(chatRequest(messages, body))
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

  it('sends only the question, with the session the agent opened', async () => {
    const user = userEvent.setup()
    const agent = fakeAgent(
      [...session(SESSION), ...text('One pick.')],
      [...session(SESSION), ...text('Sure.')],
    )
    renderChat(agent.transport)
    const input = await screen.findByLabelText('Your question')

    await user.type(input, 'First{Enter}')
    await waitFor(async () =>
      expect(await lastItem()).toBe('Robospresso: One pick.'),
    )
    await user.type(input, 'Tell me more{Enter}')

    await waitFor(() => expect(agent.calls).toHaveLength(2))
    expect(agent.calls).toEqual([
      { sessionId: undefined, text: 'First' },
      { sessionId: SESSION, text: 'Tell me more' },
    ])
    // The session part is bookkeeping, never drawn.
    expect((await log()).textContent).not.toContain(SESSION)
  })

  it('says so when the agent had lost the conversation', async () => {
    const user = userEvent.setup()
    const agent = fakeAgent(
      [...session(SESSION), ...text('One pick.')],
      [...session(NEW_SESSION, true), ...text('Starting over.')],
      [...session(NEW_SESSION), ...text('Sure.')],
    )
    renderChat(agent.transport)
    const input = await screen.findByLabelText('Your question')

    await user.type(input, 'First{Enter}')
    await waitFor(async () =>
      expect(await lastItem()).toBe('Robospresso: One pick.'),
    )
    expect((await log()).textContent).not.toContain(CHAT_RESTARTED_NOTE)

    await user.type(input, 'Second{Enter}')
    await waitFor(async () =>
      expect(await lastItem()).toBe('Robospresso: Starting over.'),
    )
    const items = within(await log())
      .getAllByRole('listitem')
      .map((item) => item.textContent)
    // Right under the question that found the conversation gone.
    expect(items.slice(-3)).toEqual([
      'You: Second',
      `Robospresso: ${CHAT_RESTARTED_NOTE}`,
      'Robospresso: Starting over.',
    ])

    await user.type(input, 'Third{Enter}')
    await waitFor(() => expect(agent.calls).toHaveLength(3))
    expect(agent.calls.at(2)?.sessionId).toBe(NEW_SESSION)
  })

  it('starts a new chat: back to the greeting, with no session', async () => {
    const user = userEvent.setup()
    const agent = fakeAgent(
      [...session(SESSION), ...text('One pick.')],
      [...session(NEW_SESSION), ...text('Hello again.')],
    )
    renderChat(agent.transport)
    const newChat = await screen.findByRole<HTMLButtonElement>('button', {
      name: 'New chat',
    })
    expect(newChat.disabled).toBe(true)
    const input = await screen.findByLabelText('Your question')

    await user.type(input, 'First{Enter}')
    await waitFor(async () =>
      expect(await lastItem()).toBe('Robospresso: One pick.'),
    )
    await user.click(newChat)

    const items = within(await log()).getAllByRole('listitem')
    expect(items).toHaveLength(1)
    expect(items[0]?.textContent).toContain(CHAT_GREETING)
    expect(
      screen.getByRole('list', { name: 'Suggested questions' }),
    ).toBeTruthy()

    await user.type(input, 'Hi{Enter}')
    await waitFor(() => expect(agent.calls).toHaveLength(2))
    expect(agent.calls.at(1)).toEqual({ sessionId: undefined, text: 'Hi' })
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

  it('apologises when the agent fails, and clears it on the next answer', async () => {
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
    expect(agent.calls.at(1)).toEqual({ sessionId: undefined, text: 'Again' })
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
