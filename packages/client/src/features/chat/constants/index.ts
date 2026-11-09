import { MAX_MESSAGE_LENGTH } from '@espressionism/agent/contract'
import { z } from 'zod'

export { MAX_MESSAGE_LENGTH }

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
  "Ciao! Robospresso here, your espresso concierge. Give me a budget and I'll search our store for machines, best rated first."

/** Starter questions shown above the composer. */
export const CHAT_SUGGESTIONS = [
  'Under €500, please',
  'Rated over 3 stars',
  'Show me the 5 cheapest',
] as const

/** Shown above the answer when the agent had lost the conversation. */
export const CHAT_RESTARTED_NOTE =
  "I lost track of our earlier chat, so let's start fresh."

/** Shown when the agent can't be reached or answers with an error. */
export const CHAT_ERROR_REPLY =
  'My circuits got a little over-extracted. Give it another go in a sec?'

/** Whether this build has a model behind the chat (see vite.config.ts). */
export const CHAT_LIVE: boolean = __CHAT_LIVE__

/** The header's status badge and tagline, by whether a model is connected. */
export const CHAT_STATUS_COPY = {
  live: {
    badge: 'Live',
    title: 'Connected to Gemini: answers come from the store, live.',
    tagline: 'Your espresso concierge. Shades on, deals found.',
  },
  offline: {
    badge: 'Offline',
    title: 'No model connected: replies are a placeholder.',
    tagline: 'Demo mode: connect a model to let me search the store.',
  },
} as const
