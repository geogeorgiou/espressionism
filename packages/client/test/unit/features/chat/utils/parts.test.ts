import type { RobospressoMessage } from '@espressionism/agent/contract'
import { DEFAULT_INPUTS, runCalculatorFill } from '@espressionism/calculator'
import { CATALOG } from '@espressionism/store'
import { describe, expect, it } from 'vite-plus/test'

import {
  isSearching,
  messageViews,
  storeLinkSearch,
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

  it('shows one skeleton per requested card while the call streams', () => {
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
        state: 'input-streaming',
        input: undefined,
      }),
    ).toEqual({ kind: 'cards-loading', count: 2 })
  })

  it('draws cards from a valid output only', () => {
    const part = (output: unknown): Part =>
      ({
        type: 'tool-show_machines',
        toolCallId: 'c1',
        state: 'output-available',
        input: { slugs: [machine.slug] },
        output,
      }) as Part
    expect(toPartView(part({ ok: true, items: [machine] }))).toEqual({
      kind: 'cards',
      machines: [machine],
    })
    expect(toPartView(part({ ok: false, errors: [] }))).toBe(null)
    expect(
      toPartView(part({ ok: true, items: [{ ...machine, price: 'free' }] })),
    ).toBe(null)
  })

  it('draws nothing for a failed display call', () => {
    expect(
      toPartView({
        type: 'tool-show_machines',
        toolCallId: 'c1',
        state: 'output-error',
        input: undefined,
        errorText: 'boom',
      }),
    ).toBe(null)
  })

  it('draws the calculator card from a successful fill only', () => {
    const fill = runCalculatorFill(DEFAULT_INPUTS, { cupsPerDay: 2 })
    expect(toPartView(fillPart(fill))).toEqual({
      kind: 'calculator',
      message: fill.ok ? fill.message : '',
    })
    expect(
      toPartView(
        fillPart({ ok: false, errors: [{ field: 'x', message: 'y' }] }),
      ),
    ).toBe(null)
    expect(toPartView(fillPart({ ok: true, message: 'forged' }))).toBe(null)
  })
})

describe('storeLinkSearch', () => {
  it('maps the filters to store params, leaving out defaults', () => {
    expect(
      storeLinkSearch({
        ok: true,
        filters: { minPrice: 200, maxPrice: 600, minRating: 4.6 },
        sort: 'rating_desc',
        total: 3,
      }),
    ).toEqual({ minPrice: 200, maxPrice: 600, minRating: 4.5 })
    expect(
      storeLinkSearch({ ok: true, filters: {}, sort: 'price_asc', total: 10 }),
    ).toEqual({ sort: 'price_asc' })
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
