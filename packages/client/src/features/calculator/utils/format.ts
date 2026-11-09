import type { Currency } from '@espressionism/calculator'

export type { Currency } from '@espressionism/calculator'
export {
  CURRENCIES,
  formatDuration,
  formatMoney,
} from '@espressionism/calculator'

/** Short axis label for a month index: "M6", "Y2". */
export function formatMonthTick(month: number): string {
  if (month === 0) return 'Now'
  return month % 12 === 0 ? `Y${month / 12}` : `M${month}`
}

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
}
