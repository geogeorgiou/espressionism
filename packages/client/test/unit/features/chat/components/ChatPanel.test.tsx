import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vite-plus/test'

import { ChatPanel } from '@/features/chat/components/ChatPanel'
import { CHAT_GREETING } from '@/features/chat/constants'
import { stubReply } from '@/features/chat/utils/messages'

function log() {
  return screen.getByRole('log', { name: 'Conversation' })
}

function sendButton() {
  return screen.getByRole<HTMLButtonElement>('button', { name: 'Send' })
}

describe('ChatPanel', () => {
  it('opens with a greeting and nothing to send', () => {
    render(<ChatPanel replyDelayMs={0} />)
    expect(log().textContent).toContain(CHAT_GREETING)
    expect(sendButton().disabled).toBe(true)
  })

  it('sends a typed question, clears the input and shows the reply', async () => {
    const user = userEvent.setup()
    render(<ChatPanel replyDelayMs={0} />)
    const input = screen.getByLabelText<HTMLInputElement>('Your question')

    await user.type(input, 'Machines under 200?{Enter}')

    const items = within(log()).getAllByRole('listitem')
    expect(items.at(1)?.textContent).toBe('You: Machines under 200?')
    await waitFor(() => expect(input.value).toBe(''))
    await waitFor(() =>
      expect(within(log()).getAllByRole('listitem').at(-1)?.textContent).toBe(
        `Robospresso: ${stubReply()}`,
      ),
    )
  })

  it('sends a suggested question when it is clicked', async () => {
    const user = userEvent.setup()
    render(<ChatPanel replyDelayMs={0} />)

    await user.click(screen.getByRole('button', { name: 'Rated over 3 stars' }))

    expect(log().textContent).toContain('You: Rated over 3 stars')
    expect(screen.queryByRole('list', { name: 'Suggested questions' })).toBe(
      null,
    )
  })

  it('ignores a blank question', async () => {
    const user = userEvent.setup()
    render(<ChatPanel replyDelayMs={0} />)

    await user.type(screen.getByLabelText('Your question'), '   {Enter}')

    expect(within(log()).getAllByRole('listitem')).toHaveLength(1)
    expect(sendButton().disabled).toBe(true)
  })
})
