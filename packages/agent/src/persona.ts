import type { ChatTurn } from './contract'

/**
 * Placeholder answer until the model and the store tool land.
 * It never pretends to know prices.
 */
export const STUB_REPLY =
  "My magnifier is still in the shop, so no picks yet. Soon I'll search our store and line up machines for you, best rated first."

export function stubReply(_messages: ChatTurn[]): string {
  return STUB_REPLY
}
