import { describe, expect, it } from 'vite-plus/test'

import {
  formatDuration,
  formatMoney,
  formatMonthTick,
} from '@/features/calculator/utils/format'

describe('format', () => {
  it('formats money with or without cents', () => {
    expect(formatMoney(1040, 'EUR')).toBe('€1,040')
    expect(formatMoney(3.5, 'USD', { cents: true })).toBe('$3.50')
  })

  it('rounds durations up to whole months', () => {
    expect(formatDuration(0.2)).toBe('1 month')
    expect(formatDuration(7.4)).toBe('8 months')
    expect(formatDuration(12)).toBe('1 year')
    expect(formatDuration(26)).toBe('2 years 2 months')
  })

  it('labels month ticks', () => {
    expect(formatMonthTick(0)).toBe('Now')
    expect(formatMonthTick(6)).toBe('M6')
    expect(formatMonthTick(24)).toBe('Y2')
  })
})
