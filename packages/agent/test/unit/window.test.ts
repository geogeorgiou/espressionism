import { describe, expect, it } from 'vite-plus/test'

import type { ChatTurn } from '../../src/contract'
import { selectWindow } from '../../src/memory'

const user = (text: string): ChatTurn => ({ role: 'user', text })
const robot = (text: string): ChatTurn => ({ role: 'assistant', text })

describe('selectWindow', () => {
  it('keeps a conversation under budget as it is', () => {
    const turns = [user('Under €300?'), robot('Two fit.'), user('Cheaper?')]
    expect(selectWindow(turns)).toEqual(turns)
  })

  it('keeps the newest turns that fit maxTurns, starting on a user turn', () => {
    const turns = [user('a'), robot('b'), user('c'), robot('d'), user('e')]
    // The newest four would start on robot('b'): drop it too.
    expect(selectWindow(turns, { maxTurns: 4, maxChars: 1000 })).toEqual([
      user('c'),
      robot('d'),
      user('e'),
    ])
  })

  it('keeps the newest turns that fit maxChars, starting on a user turn', () => {
    const turns = [
      user('x'.repeat(50)),
      robot('y'.repeat(50)),
      user('z'.repeat(30)),
      robot('w'.repeat(30)),
      user('v'.repeat(30)),
    ]
    // 30 + 30 + 30 = 90 fits 100; the 50-char answer before them does not.
    expect(selectWindow(turns, { maxTurns: 40, maxChars: 100 })).toEqual(
      turns.slice(2),
    )
  })

  it('always keeps the latest question, even one over the budget', () => {
    const turns = [user('a'), robot('b'), user('q'.repeat(500))]
    expect(selectWindow(turns, { maxTurns: 40, maxChars: 100 })).toEqual([
      user('q'.repeat(500)),
    ])
  })

  it('ends on the latest question', () => {
    const turns = [user('a'), robot('b'), user('c'), robot('d')]
    expect(selectWindow(turns)).toEqual([user('a'), robot('b'), user('c')])
  })
})
