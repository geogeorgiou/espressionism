import { describe, expect, it } from 'vite-plus/test'

import { parseDecimal } from '@/features/common/form/parse-decimal'

describe('parseDecimal', () => {
  it.each([
    ['3.5', 3.5],
    ['3,5', 3.5],
    ['  12 ', 12],
    ['4.', 4],
    ['4,', 4],
    ['.5', 0.5],
    [',5', 0.5],
    ['-2', -2],
  ])('reads %j as %d', (text, expected) => {
    expect(parseDecimal(text)).toBe(expected)
  })

  it.each(['', ' ', '.', ',', 'abc', '1.2.3', '1,2,3', '1e3', '-'])(
    'rejects %j',
    (text) => {
      expect(parseDecimal(text)).toBeNaN()
    },
  )
})
