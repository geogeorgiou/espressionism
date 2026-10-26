export const CURRENCIES = ['EUR', 'USD', 'GBP'] as const
export type Currency = (typeof CURRENCIES)[number]

export function formatMoney(
  value: number,
  currency: Currency,
  options: { cents?: boolean } = {},
): string {
  const cents = options.cents ?? false
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  }).format(value)
}

function plural(n: number, unit: string): string {
  return `${n} ${unit}${n === 1 ? '' : 's'}`
}

/** "7 months", "1 year 2 months", "2 years". */
export function formatDuration(totalMonths: number): string {
  const rounded = Math.max(1, Math.ceil(totalMonths))
  const years = Math.floor(rounded / 12)
  const months = rounded % 12
  if (years === 0) return plural(months, 'month')
  if (months === 0) return plural(years, 'year')
  return `${plural(years, 'year')} ${plural(months, 'month')}`
}

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
