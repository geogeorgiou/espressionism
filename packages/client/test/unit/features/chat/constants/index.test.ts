import { describe, expect, it } from 'vite-plus/test'

import {
  MAX_MESSAGE_LENGTH,
  chatMessageSchema,
} from '@/features/chat/constants'

describe('chatMessageSchema', () => {
  it('trims a question', () => {
    expect(chatMessageSchema.parse({ message: '  under €300  ' })).toEqual({
      message: 'under €300',
    })
  })

  it.each(['', '   '])('rejects a blank question (%j)', (message) => {
    const result = chatMessageSchema.safeParse({ message })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe('Ask me something first')
  })

  it('rejects a question over the length limit', () => {
    const message = 'a'.repeat(MAX_MESSAGE_LENGTH + 1)
    expect(chatMessageSchema.safeParse({ message }).success).toBe(false)
  })
})
