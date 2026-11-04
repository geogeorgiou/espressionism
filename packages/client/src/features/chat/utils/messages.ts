export type ChatRole = 'assistant' | 'user'

export interface ChatMessage {
  id: string
  role: ChatRole
  text: string
}

/**
 * Placeholder answer until the backend exists (roadmap step 5). It never
 * pretends to know prices.
 */
export function stubReply(): string {
  return "My magnifier is still in the shop, so no deals yet. Soon I'll scan Skroutz and line up machines for you, cheapest first."
}
