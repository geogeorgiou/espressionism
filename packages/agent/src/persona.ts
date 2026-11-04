import type { ChatTurn } from './contract'

/**
 * Placeholder answer until scraping and the model land (roadmap steps 2–5).
 * It never pretends to know prices.
 */
export const STUB_REPLY =
  "My magnifier is still in the shop, so no deals yet. Soon I'll scan Skroutz and line up machines for you, cheapest first."

export function stubReply(_messages: ChatTurn[]): string {
  return STUB_REPLY
}
