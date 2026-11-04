import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vite-plus/test'

import { ChatPanel } from '@/features/chat/components/ChatPanel'
import { CHAT_ERROR_REPLY, CHAT_GREETING } from '@/features/chat/constants'
import type { ChatTransport } from '@/features/chat/utils/messages'

function log() {
  return screen.getByRole('log', { name: 'Conversation' })
}

function lastItem() {
  return within(log()).getAllByRole('listitem').at(-1)?.textContent
}

function sendButton() {
  return screen.getByRole<HTMLButtonElement>('button', { name: 'Send' })
}

/** A fake agent that records what it was sent. */
function fakeAgent(reply: string | Error = 'Grazie!') {
  const calls: Parameters<ChatTransport>[0][] = []
  const transport: ChatTransport = async (messages) => {
    calls.push(messages)
    if (reply instanceof Error) throw reply
    return reply
  }
  return { calls, transport }
}

describe('ChatPanel', () => {
  it('opens with a greeting and nothing to send', () => {
    render(<ChatPanel transport={fakeAgent().transport} />)
    expect(log().textContent).toContain(CHAT_GREETING)
    expect(sendButton().disabled).toBe(true)
  })

  it('sends a typed question, clears the input and shows the reply', async () => {
    const user = userEvent.setup()
    const agent = fakeAgent('Two machines under €200.')
    render(<ChatPanel transport={agent.transport} />)
    const input = screen.getByLabelText<HTMLInputElement>('Your question')

    await user.type(input, 'Machines under 200?{Enter}')

    const items = within(log()).getAllByRole('listitem')
    expect(items.at(1)?.textContent).toBe('You: Machines under 200?')
    await waitFor(() => expect(input.value).toBe(''))
    await waitFor(() =>
      expect(lastItem()).toBe('Robospresso: Two machines under €200.'),
    )
  })

  it('sends the conversation without the greeting', async () => {
    const user = userEvent.setup()
    const agent = fakeAgent('Ciao!')
    render(<ChatPanel transport={agent.transport} />)
    const input = screen.getByLabelText('Your question')

    await user.type(input, 'First{Enter}')
    await waitFor(() => expect(lastItem()).toBe('Robospresso: Ciao!'))
    await user.type(input, 'Second{Enter}')

    await waitFor(() => expect(agent.calls).toHaveLength(2))
    expect(agent.calls.at(1)).toEqual([
      { role: 'user', text: 'First' },
      { role: 'assistant', text: 'Ciao!' },
      { role: 'user', text: 'Second' },
    ])
  })

  it('sends a suggested question when it is clicked', async () => {
    const user = userEvent.setup()
    render(<ChatPanel transport={fakeAgent().transport} />)

    await user.click(screen.getByRole('button', { name: 'Rated over 3 stars' }))

    expect(log().textContent).toContain('You: Rated over 3 stars')
    expect(screen.queryByRole('list', { name: 'Suggested questions' })).toBe(
      null,
    )
  })

  it('apologises when the agent fails, and leaves that out of the history', async () => {
    const user = userEvent.setup()
    const broken = fakeAgent(new Error('offline'))
    const { rerender } = render(<ChatPanel transport={broken.transport} />)
    const input = screen.getByLabelText('Your question')

    await user.type(input, 'Hello?{Enter}')
    await waitFor(() =>
      expect(lastItem()).toBe(`Robospresso: ${CHAT_ERROR_REPLY}`),
    )

    const working = fakeAgent('Back online.')
    rerender(<ChatPanel transport={working.transport} />)
    await user.type(input, 'Again{Enter}')
    await waitFor(() => expect(working.calls).toHaveLength(1))
    expect(working.calls.at(0)).toEqual([
      { role: 'user', text: 'Hello?' },
      { role: 'user', text: 'Again' },
    ])
  })

  it('ignores a blank question', async () => {
    const user = userEvent.setup()
    const agent = fakeAgent()
    render(<ChatPanel transport={agent.transport} />)

    await user.type(screen.getByLabelText('Your question'), '   {Enter}')

    expect(within(log()).getAllByRole('listitem')).toHaveLength(1)
    expect(sendButton().disabled).toBe(true)
    expect(agent.calls).toHaveLength(0)
  })
})
