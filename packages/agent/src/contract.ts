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
import { calculatorSchema, fillTool } from '@espressionism/calculator'
import { machineSchema, searchResultSchema } from '@espressionism/store'
import type { searchTool } from '@espressionism/store'
import type { ToolOutput, ToolTypes } from '@espressionism/tool'
import type { UIMessage } from 'ai'
import { z } from 'zod'

import { showMachinesTool, showStoreLinkTool } from './display-tools'

export { calculatorSchema, machineSchema, searchResultSchema }
export { MAX_SHOWN_MACHINES } from './display-tools'

export const CHAT_ENDPOINT = '/api/chat'

/** Largest request body the handler reads, in bytes. */
export const MAX_BODY_BYTES = 4 * 1024

/**
 * The text of the visitor's turn: trimmed, non-empty and short. The
 * composer and the handler both validate a question with it.
 */
export const turnTextSchema = z
  .string()
  .trim()
  .min(1, 'Ask me something first')
  .max(280, 'Keep it under 280 characters')

/**
 * One turn of a conversation: text only. The server writes every turn itself,
 * so tool parts never reach the model from the browser; the model searches
 * again whenever it needs facts.
 */
export const chatTurnSchema = z.object({
  role: z.enum(['user', 'assistant']),
  text: z.string().trim().min(1).max(2000),
})

/**
 * `POST /api/chat` body: the new question, the session it continues (left
 * out on the first question and after "New chat"), and the calculator's
 * values as the page shows them, so `fill_calculator` merges onto those.
 */
export const chatRequestSchema = z
  .object({
    sessionId: z.uuid().optional(),
    text: turnTextSchema,
    calculator: calculatorSchema.optional(),
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
  showMachines: showMachinesTool.name,
  showStoreLink: showStoreLinkTool.name,
  fillCalculator: fillTool.name,
} as const

/** `show_machines` output: the machines to draw as cards, in order. */
export const showMachinesOutputSchema = showMachinesTool.outputSchema

/** `fill_calculator` output: the merged values and the calculator's read. */
export const fillCalculatorOutputSchema = fillTool.outputSchema

/** `show_store_link` output: the store's filters and how many machines match. */
export const showStoreLinkOutputSchema = showStoreLinkTool.outputSchema

export type ChatTurn = z.infer<typeof chatTurnSchema>
export type ChatRequest = z.infer<typeof chatRequestSchema>
export type ChatError = z.infer<typeof chatErrorSchema>
export type SessionData = z.infer<typeof sessionDataSchema>
export type ShowMachinesOutput = ToolOutput<typeof showMachinesTool>
export type ShowStoreLinkOutput = ToolOutput<typeof showStoreLinkTool>
export type FillCalculatorOutput = ToolOutput<typeof fillTool>
export type { Machine, SearchResult } from '@espressionism/store'

/** Every tool Robospresso may call. */
type RobospressoToolDefs =
  | typeof searchTool
  | typeof showMachinesTool
  | typeof showStoreLinkTool
  | typeof fillTool

/** Every tool part a Robospresso message can carry, by tool name. */
export type RobospressoTools = {
  [D in RobospressoToolDefs as D['name']]: ToolTypes<D>
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
