import { z } from 'zod'

export const MAX_MESSAGE_LENGTH = 280

/** The composer's form: one trimmed, non-empty question. */
export const chatMessageSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, 'Ask me something first')
    .max(MAX_MESSAGE_LENGTH, `Keep it under ${MAX_MESSAGE_LENGTH} characters`),
})

export type ChatFormValues = z.input<typeof chatMessageSchema>

export const CHAT_DEFAULT_VALUES: ChatFormValues = { message: '' }

export const CHAT_GREETING =
  "Hi, I'm Robospresso. Ask me about espresso machines on Skroutz: prices, ratings and reviews."

/** Starter questions shown above the composer. */
export const CHAT_SUGGESTIONS = [
  'Machines under €300',
  'Rated over 3 stars',
  'The 5 cheapest',
] as const

/** How long the stub "searches" before it answers. */
export const STUB_REPLY_DELAY_MS = 700
