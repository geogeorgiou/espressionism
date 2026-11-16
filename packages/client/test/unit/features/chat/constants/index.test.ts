import { describe, expect, it } from 'vite-plus/test'

import { chatMessageSchema, turnTextSchema } from '@/features/chat/constants'

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
    const message = 'a'.repeat((turnTextSchema.maxLength ?? 0) + 1)
    const result = chatMessageSchema.safeParse({ message })
    expect(result.success).toBe(false)
    expect(result.error?.issues[0]?.message).toBe(
      'Keep it under 280 characters',
    )
  })
})
