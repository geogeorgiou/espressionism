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
  return "I can't look up machines yet. Soon I'll fetch espresso machines from Skroutz and sort them by price for you."
}
