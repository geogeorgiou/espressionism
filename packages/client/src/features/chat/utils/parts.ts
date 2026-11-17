import type {
  Machine,
  RobospressoMessage,
  SearchResult,
} from '@espressionism/agent/contract'
import { readDisplayPart } from '@espressionism/agent/contract'
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

/**
 * The renderer registry's pure half: one message part → what to draw, or
 * null for parts the visitor never sees (the search itself, step markers,
 * a display call the model got wrong and will retry). `readDisplayPart`
 * reads the tool parts against the agent's contract.
 */
export function toPartView(part: Part): PartView | null {
  if (part.type === 'text') {
    return part.text.trim() ? { kind: 'text', text: part.text } : null
  }
  const display = readDisplayPart(part)
  switch (display?.tool) {
    case 'show_machines':
      return display.state === 'loading'
        ? { kind: 'cards-loading', count: display.count }
        : { kind: 'cards', machines: display.machines }
    case 'show_store_link':
      return {
        kind: 'store-link',
        search: storeLinkSearch(display),
        total: display.total,
      }
    case 'fill_calculator':
      return { kind: 'calculator', message: display.fill.message }
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
  link: Pick<SearchResult, 'filters' | 'sort'>,
): StoreSearch {
  const form = storeFormSchema.parse(agentSearchToForm(link))
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
