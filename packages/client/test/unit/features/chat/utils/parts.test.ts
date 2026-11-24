import type { RobospressoMessage } from '@espressionism/agent/contract'
import { DEFAULT_INPUTS, fillTool } from '@espressionism/calculator'
import { CATALOG } from '@espressionism/store'
import { describe, expect, it } from 'vite-plus/test'

import {
  isSearching,
  messageViews,
  toPartView,
} from '@/features/chat/utils/parts'

type Part = RobospressoMessage['parts'][number]

const machine = CATALOG[0]

function assistant(...parts: Part[]): RobospressoMessage {
  return { id: 'a1', role: 'assistant', parts }
}

const user: RobospressoMessage = {
  id: 'u1',
  role: 'user',
  parts: [{ type: 'text', text: 'Hi' }],
}

/** A finished `fill_calculator` call with this output. */
function fillPart(output: unknown): Part {
  return {
    type: 'tool-fill_calculator',
    toolCallId: 'f1',
    state: 'output-available',
    input: { cupsPerDay: 2 },
    output: output as never,
  }
}

const search: Part = {
  type: 'tool-search_espresso_machines',
  toolCallId: 's1',
  state: 'input-available',
  input: {},
}

// Which outputs count as valid is `readDisplayPart`'s job (agent tests);
// these check only what the chat draws for each kind of part.
describe('toPartView', () => {
  it('draws text, skipping blank parts', () => {
    expect(toPartView({ type: 'text', text: 'Ciao' })).toEqual({
      kind: 'text',
      text: 'Ciao',
    })
    expect(toPartView({ type: 'text', text: '  ' })).toBe(null)
  })

  it('never draws the search itself', () => {
    expect(toPartView(search)).toBe(null)
  })

  it('draws skeleton cards while the call streams, then the cards', () => {
    expect(
      toPartView({
        type: 'tool-show_machines',
        toolCallId: 'c1',
        state: 'input-available',
        input: { slugs: ['a', 'b', 'c'] },
      }),
    ).toEqual({ kind: 'cards-loading', count: 3 })
    expect(
      toPartView({
        type: 'tool-show_machines',
        toolCallId: 'c1',
        state: 'output-available',
        input: { slugs: [machine.slug] },
        output: { ok: true, items: [machine] },
      }),
    ).toEqual({ kind: 'cards', machines: [machine] })
  })

  it('draws the store link with store params', () => {
    expect(
      toPartView({
        type: 'tool-show_store_link',
        toolCallId: 'l1',
        state: 'output-available',
        input: {},
        output: {
          ok: true,
          filters: { maxPrice: 300 },
          sort: 'rating_desc',
          total: 7,
        },
      }),
    ).toEqual({ kind: 'store-link', search: { maxPrice: 300 }, total: 7 })
  })

  it('draws the calculator card from a fill, nothing from a failed one', () => {
    const output = fillTool.run({ cupsPerDay: 2 }, { current: DEFAULT_INPUTS })
    expect(toPartView(fillPart(output))).toEqual({
      kind: 'calculator',
      message: output.ok ? output.message : '',
    })
    expect(
      toPartView(
        fillPart({ ok: false, errors: [{ field: 'x', message: 'y' }] }),
      ),
    ).toBe(null)
  })
})

describe('isSearching', () => {
  it('is on from sending until there is something to show', () => {
    expect(isSearching([user], 'submitted')).toBe(true)
    expect(isSearching([user], 'streaming')).toBe(true)
    expect(isSearching([user, assistant(search)], 'streaming')).toBe(true)
    expect(
      isSearching(
        [user, assistant(search, { type: 'text', text: 'Found some' })],
        'streaming',
      ),
    ).toBe(false)
  })

  it('is off once the answer is done or failed', () => {
    expect(isSearching([user, assistant(search)], 'ready')).toBe(false)
    expect(isSearching([user], 'error')).toBe(false)
  })

  it('lists only what the visitor sees', () => {
    expect(
      messageViews(assistant(search, { type: 'text', text: 'Hi' })),
    ).toEqual([{ kind: 'text', text: 'Hi', key: 'text-1' }])
  })
})
