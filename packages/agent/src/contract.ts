/**
 * The HTTP contract between the chat UI and the agent. Pure Zod and types,
 * no server code, so the client can import it
 * (`@espressionism/agent/contract`) without pulling the agent into the
 * browser bundle.
 *
 * A request is one question plus the session it belongs to; the server
 * holds the conversation (Robospresso's memory). Replies are an AI SDK UI
 * message stream (server-sent events): a transient `data-session` part, then
 * text parts plus tool parts the client renders as components. The display
 * tools' outputs and the session part are parsed with the schemas below.
 */
import { machineSchema, searchResultSchema } from '@espressionism/store'
import type { SearchToolInput, SearchToolResult } from '@espressionism/store'
import type { UIMessage } from 'ai'
import { z } from 'zod'

export { machineSchema, searchResultSchema }

export const CHAT_ENDPOINT = '/api/chat'

/** Longest question the composer accepts. */
export const MAX_MESSAGE_LENGTH = 280
/** Largest request body the handler reads, in bytes. */
export const MAX_BODY_BYTES = 4 * 1024
/** Most machines one `show_machines` call puts on screen. */
export const MAX_SHOWN_MACHINES = 5

/**
 * One turn of a session: text only. The server writes every turn itself,
 * so tool parts never reach the model from the browser; the model searches
 * again whenever it needs facts.
 */
export const chatTurnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string().trim().min(1).max(2000),
})

/**
 * `POST /api/chat` body: the new question, and the session it continues
 * (left out on the first question and after "New chat").
 */
export const chatRequestSchema = z
  .object({
    sessionId: z.uuid().optional(),
    text: z.string().trim().min(1).max(MAX_MESSAGE_LENGTH),
  })
  .strict()

/**
 * The `data-session` part opening every reply: the session the answer was
 * recorded in. `restarted` means the server had lost the session the client
 * asked for and started a new one.
 */
export const sessionDataSchema = z.object({
  id: z.uuid(),
  restarted: z.boolean(),
})

/** Any error the agent answers with before the stream starts. */
export const chatErrorSchema = z.object({ error: z.string() })

/** The tools whose parts the chat draws, by the names the model sees. */
export const DISPLAY_TOOLS = {
  showMachines: 'show_machines',
  showStoreLink: 'show_store_link',
} as const

const toolErrorSchema = z.object({ field: z.string(), message: z.string() })

const toolFailureSchema = z.object({
  ok: z.literal(false),
  errors: z.array(toolErrorSchema),
})

/** `show_machines` output: the machines to draw as cards, in order. */
export const showMachinesOutputSchema = z.discriminatedUnion('ok', [
  z.object({ ok: z.literal(true), items: z.array(machineSchema).min(1) }),
  toolFailureSchema,
])

/** `show_store_link` output: the store's filters and how many machines match. */
export const showStoreLinkOutputSchema = z.discriminatedUnion('ok', [
  searchResultSchema
    .pick({ filters: true, sort: true, total: true })
    .extend({ ok: z.literal(true) }),
  toolFailureSchema,
])

export type ChatTurn = z.infer<typeof chatTurnSchema>
export type ChatRequest = z.infer<typeof chatRequestSchema>
export type ChatError = z.infer<typeof chatErrorSchema>
export type SessionData = z.infer<typeof sessionDataSchema>
export type ShowMachinesOutput = z.infer<typeof showMachinesOutputSchema>
export type ShowStoreLinkOutput = z.infer<typeof showStoreLinkOutputSchema>
export type { Machine, SearchResult } from '@espressionism/store'

export interface ShowMachinesInput {
  slugs: string[]
}
export type ShowStoreLinkInput = Omit<SearchToolInput, 'limit'>

/** Every tool part a Robospresso message can carry. */
export type RobospressoTools = {
  search_espresso_machines: {
    input: SearchToolInput
    output: SearchToolResult
  }
  show_machines: { input: ShowMachinesInput; output: ShowMachinesOutput }
  show_store_link: { input: ShowStoreLinkInput; output: ShowStoreLinkOutput }
}

/** The data parts a reply can carry, by name (`data-<name>`). */
export type RobospressoData = {
  session: SessionData
}

/** A chat message as the UI holds it: text and tool parts, in order. */
export type RobospressoMessage = UIMessage<
  unknown,
  RobospressoData,
  RobospressoTools
>
