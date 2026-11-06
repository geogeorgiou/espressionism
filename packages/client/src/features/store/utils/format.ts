import type { Machine } from '@espressionism/store'

const PRICE = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
})

/** "€1,209". */
export function formatPrice(machine: Pick<Machine, 'price'>): string {
  return PRICE.format(machine.price)
}

/** "4.7", "4.0", or null when unrated. */
export function formatRating(rating: number | null): string | null {
  return rating === null ? null : rating.toFixed(1)
}

/** "6 of 10 machines". */
export function formatCount(shown: number, total: number): string {
  return `${shown} of ${total} machine${total === 1 ? '' : 's'}`
}
