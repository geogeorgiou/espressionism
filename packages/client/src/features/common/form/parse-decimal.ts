/**
 * Reads a number typed by hand, accepting a comma as the decimal separator
 * (mobile keyboards in many locales only offer ","). Returns NaN for an empty
 * or malformed entry so the form schema reports it.
 */
export function parseDecimal(text: string): number {
  const normalized = text.trim().replace(',', '.')
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(normalized)) return Number.NaN
  return Number(normalized)
}
