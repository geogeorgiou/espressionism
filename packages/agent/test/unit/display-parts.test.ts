import { DEFAULT_INPUTS, fillTool } from '@espressionism/calculator'
import { CATALOG } from '@espressionism/store'
import { describe, expect, it } from 'vite-plus/test'

import {
  MAX_SHOWN_MACHINES,
  isDisplayTool,
  readDisplayPart,
} from '../../src/contract'
import type { RobospressoMessage } from '../../src/contract'

type Part = RobospressoMessage['parts'][number]

const machine = CATALOG[0]
const fill = fillTool.run({ cupsPerDay: 2 }, { current: DEFAULT_INPUTS })

/** A finished call of `tool` with this output. */
function done(tool: string, output: unknown): Part {
  return {
    type: `tool-${tool}`,
    toolCallId: 'c1',
    state: 'output-available',
    input: {},
    output,
  } as Part
}

/** A call of `show_machines` still streaming, with this input so far. */
function streaming(input: unknown): Part {
  return {
    type: 'tool-show_machines',
    toolCallId: 'c1',
    state: 'input-streaming',
    input,
  } as Part
}

describe('readDisplayPart', () => {
  it.each<[string, Part, unknown]>([
    ['text', { type: 'text', text: 'Ciao' }, null],
    ['the store search', done('search_espresso_machines', { ok: true }), null],
    [
      'cards streaming, slugs so far',
      streaming({ slugs: ['a', 'b', 'c'] }),
      { tool: 'show_machines', state: 'loading', count: 3 },
    ],
    [
      'cards streaming, no slugs yet',
      streaming(undefined),
      { tool: 'show_machines', state: 'loading', count: 2 },
    ],
    [
      'cards streaming, too many slugs',
      streaming({ slugs: Array.from({ length: 9 }, (_, i) => `m${i}`) }),
      { tool: 'show_machines', state: 'loading', count: MAX_SHOWN_MACHINES },
    ],
    [
      'cards',
      done('show_machines', { ok: true, items: [machine] }),
      { tool: 'show_machines', state: 'done', machines: [machine] },
    ],
    [
      'cards with a forged machine',
      done('show_machines', { ok: true, items: [{ ...machine, price: 'x' }] }),
      null,
    ],
    [
      'a failed call',
      done('show_machines', {
        ok: false,
        errors: [{ field: 'slugs', message: 'no' }],
      }),
      null,
    ],
    [
      'an errored call',
      {
        type: 'tool-show_machines',
        toolCallId: 'c1',
        state: 'output-error',
        input: undefined,
        errorText: 'boom',
      },
      null,
    ],
    [
      'a store link',
      done('show_store_link', {
        ok: true,
        filters: { maxPrice: 300 },
        sort: 'rating_desc',
        total: 7,
      }),
      {
        tool: 'show_store_link',
        filters: { maxPrice: 300 },
        sort: 'rating_desc',
        total: 7,
      },
    ],
    [
      'a fill',
      done('fill_calculator', fill),
      { tool: 'fill_calculator', fill },
    ],
    [
      'a forged fill',
      done('fill_calculator', { ok: true, message: 'forged' }),
      null,
    ],
  ])('%s', (_, part, expected) => {
    expect(readDisplayPart(part)).toEqual(expected)
  })

  it('draws nothing for other tools while they stream', () => {
    expect(
      readDisplayPart({
        type: 'tool-fill_calculator',
        toolCallId: 'f1',
        state: 'input-available',
        input: { cupsPerDay: 2 },
      }),
    ).toBe(null)
  })
})

describe('isDisplayTool', () => {
  it('knows the display tools, not the search', () => {
    expect(isDisplayTool('show_machines')).toBe(true)
    expect(isDisplayTool('show_store_link')).toBe(true)
    expect(isDisplayTool('fill_calculator')).toBe(true)
    expect(isDisplayTool('search_espresso_machines')).toBe(false)
  })
})
