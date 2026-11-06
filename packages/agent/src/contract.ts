/**
 * The HTTP contract between the chat UI and the agent. Pure Zod, no server
 * code, so the client can import it (`@espressionism/agent/contract`)
 * without pulling the agent into the browser bundle.
 */
import { STORE_SORTS, machineSchema } from '@espressionism/store'
import { z } from 'zod'

export { machineSchema }

export const CHAT_ENDPOINT = '/api/chat'

/** Longest question the composer accepts. */
export const MAX_MESSAGE_LENGTH = 280
/** Turns of history the agent reads per request. */
export const MAX_HISTORY = 40
/** Largest request body the handler reads, in bytes. */
export const MAX_BODY_BYTES = 32 * 1024

export const chatTurnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string().trim().min(1).max(2000),
})

/** `POST /api/chat` body: the conversation so far, ending with the user. */
export const chatRequestSchema = z.object({
  messages: z
    .array(chatTurnSchema)
    .min(1)
    .max(MAX_HISTORY)
    .refine((turns) => turns.at(-1)?.role === 'user', {
      message: 'The last turn must be the user',
    }),
})

/** `POST /api/chat` success: Robospresso's answer. */
export const chatReplySchema = z.object({
  message: z.object({
    role: z.literal('assistant'),
    text: z.string(),
  }),
})

/** Any error from the agent. */
export const chatErrorSchema = z.object({ error: z.string() })

/**
 * What the search tool returns: the store catalog, filtered and sorted by
 * `searchMachines` from `@espressionism/store`.
 */
export const searchResultSchema = z.object({
  source: z.literal('espressionism-store'),
  filters: z.object({
    minPrice: z.number().nonnegative().optional(),
    maxPrice: z.number().nonnegative().optional(),
    minRating: z.number().min(0).max(5).optional(),
  }),
  sort: z.enum(STORE_SORTS),
  total: z.number().int().nonnegative(),
  items: z.array(machineSchema),
})

export type ChatTurn = z.infer<typeof chatTurnSchema>
export type ChatRequest = z.infer<typeof chatRequestSchema>
export type ChatReply = z.infer<typeof chatReplySchema>
export type ChatError = z.infer<typeof chatErrorSchema>
export type { Machine } from '@espressionism/store'
export type SearchResult = z.infer<typeof searchResultSchema>
