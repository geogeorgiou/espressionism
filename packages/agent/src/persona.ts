import type { ChatTurn } from './contract'
import type { ReplyStream } from './stream'
import { textReply } from './stream'

/**
 * Placeholder answer when no model is configured (no API key).
 * It never pretends to know prices.
 */
export const STUB_REPLY =
  "My magnifier is still in the shop, so no picks yet. Soon I'll search our store and line up machines for you, best rated first."

export function stubReply(_messages: ChatTurn[]): ReplyStream {
  return textReply(STUB_REPLY)
}
