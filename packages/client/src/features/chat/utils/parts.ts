import type {
  Machine,
  RobospressoMessage,
  ShowStoreLinkOutput,
} from '@espressionism/agent/contract'
import {
  MAX_SHOWN_MACHINES,
  fillCalculatorOutputSchema,
  showMachinesOutputSchema,
  showStoreLinkOutputSchema,
} from '@espressionism/agent/contract'
import type { ChatStatus } from 'ai'

import type { StoreSearch } from '@/features/store/constants'
import { storeFormSchema } from '@/features/store/constants'
import {
  agentSearchToForm,
  compactSearch,
  formToSearch,
} from '@/features/store/utils/query'

type Part = RobospressoMessage['parts'][number]

/** What the chat draws for one message part. */
export type PartView =
  | { kind: 'text'; text: string }
  | { kind: 'cards-loading'; count: number }
  | { kind: 'cards'; machines: Machine[] }
  | { kind: 'store-link'; search: StoreSearch; total: number }
  | { kind: 'calculator'; message: string }

/** Skeleton cards while `show_machines` is still being called. */
const LOADING_CARDS = 2

/**
 * The renderer registry's pure half: one message part → what to draw, or
 * null for parts the visitor never sees (the search itself, step markers,
 * a display call the model got wrong and will retry). Tool outputs are
 * parsed with the agent's contract, so a malformed one draws nothing.
 */
export function toPartView(part: Part): PartView | null {
  switch (part.type) {
    case 'text':
      return part.text.trim() ? { kind: 'text', text: part.text } : null
    case 'tool-show_machines': {
      if (
        part.state === 'input-streaming' ||
        part.state === 'input-available'
      ) {
        const asked = part.input?.slugs?.length ?? LOADING_CARDS
        const count = Math.min(Math.max(asked, 1), MAX_SHOWN_MACHINES)
        return { kind: 'cards-loading', count }
      }
      if (part.state !== 'output-available') return null
      const output = showMachinesOutputSchema.safeParse(part.output)
      return output.success && output.data.ok
        ? { kind: 'cards', machines: output.data.items }
        : null
    }
    case 'tool-show_store_link': {
      if (part.state !== 'output-available') return null
      const output = showStoreLinkOutputSchema.safeParse(part.output)
      return output.success && output.data.ok
        ? {
            kind: 'store-link',
            search: storeLinkSearch(output.data),
            total: output.data.total,
          }
        : null
    }
    case 'tool-fill_calculator': {
      if (part.state !== 'output-available') return null
      const output = fillCalculatorOutputSchema.safeParse(part.output)
      return output.success && output.data.ok
        ? { kind: 'calculator', message: output.data.message }
        : null
    }
    default:
      return null
  }
}

/** A view with a key that stays put while the message streams. */
export type KeyedPartView = PartView & { key: string }

/** Every part of a message the visitor sees, in order. */
export function messageViews(message: RobospressoMessage): KeyedPartView[] {
  // Parts only ever get appended, so a text part's position is stable.
  return message.parts.flatMap((part, index) => {
    const view = toPartView(part)
    if (!view) return []
    const key = 'toolCallId' in part ? part.toolCallId : `${part.type}-${index}`
    return [{ ...view, key }]
  })
}

/**
 * The agent's filters → `/store` search params, through the same mapping
 * the store's WebMCP tool uses (a rating between the select's steps shows
 * the next one down), minus the defaults.
 */
export function storeLinkSearch(
  output: Extract<ShowStoreLinkOutput, { ok: true }>,
): StoreSearch {
  const form = storeFormSchema.parse(agentSearchToForm(output))
  return compactSearch(formToSearch(form))
}

/**
 * True while Robospresso has nothing new to show: the question is on its
 * way, or the answer so far is only its store search.
 */
export function isSearching(
  messages: RobospressoMessage[],
  status: ChatStatus,
): boolean {
  if (status === 'submitted') return true
  if (status !== 'streaming') return false
  const last = messages.at(-1)
  return last?.role !== 'assistant' || messageViews(last).length === 0
}
