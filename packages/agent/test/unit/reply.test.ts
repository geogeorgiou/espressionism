import { CATALOG } from '@espressionism/store'
import type { UIMessageChunk } from 'ai'
import { MockLanguageModelV4, convertArrayToReadableStream } from 'ai/test'
import { describe, expect, it, vi } from 'vite-plus/test'

import { agentConfigFromEnv } from '../../src/config'
import {
  EMPTY_REPLY,
  INSTRUCTIONS,
  OFF_TOPIC_REPLY,
} from '../../src/instructions'
import { createStoreReply } from '../../src/reply'
import { GENERIC_ERROR } from '../../src/stream'
import { collect, textOf } from './sse'

type StreamResult = Awaited<
  ReturnType<InstanceType<typeof MockLanguageModelV4>['doStream']>
>
type Part = StreamResult['stream'] extends ReadableStream<infer P> ? P : never

const USAGE = {
  inputTokens: { total: 10, noCache: 10, cacheRead: 0, cacheWrite: 0 },
  outputTokens: { total: 5, text: 5, reasoning: 0 },
}

function step(
  parts: Part[],
  finish: 'stop' | 'tool-calls' = 'stop',
): StreamResult {
  return {
    stream: convertArrayToReadableStream<Part>([
      { type: 'stream-start', warnings: [] },
      ...parts,
      {
        type: 'finish',
        finishReason: { unified: finish, raw: finish },
        usage: USAGE,
      },
    ]),
  }
}

let calls = 0
function call(toolName: string, input: unknown): Part {
  return {
    type: 'tool-call',
    toolCallId: `call-${calls++}`,
    toolName,
    input: JSON.stringify(input),
  }
}

/** One model step that calls these tools together. */
const tools = (...parts: Part[]) => step(parts, 'tool-calls')
const search = (input: unknown) =>
  tools(call('search_espresso_machines', input))
const answer = (text: string) =>
  step([
    { type: 'text-start', id: 't' },
    { type: 'text-delta', id: 't', delta: text },
    { type: 'text-end', id: 't' },
  ])

const question = [{ role: 'user' as const, text: 'Best machine under €300?' }]

/** The tool results the model was shown on a given call. */
function toolResults(model: MockLanguageModelV4, callIndex = 1): unknown[] {
  const prompt = model.doStreamCalls[callIndex]?.prompt ?? []
  return prompt
    .filter((message) => message.role === 'tool')
    .flatMap((message) => message.content)
    .map((part) =>
      'output' in part && part.output.type === 'json'
        ? part.output.value
        : undefined,
    )
}

/** The UI chunks of the tool outputs, keyed by tool name. */
function outputs(chunks: UIMessageChunk[]): Record<string, unknown> {
  const names = new Map<string, string>()
  const byName: Record<string, unknown> = {}
  for (const chunk of chunks) {
    if (chunk.type === 'tool-input-available') {
      names.set(chunk.toolCallId, chunk.toolName)
    }
    if (chunk.type === 'tool-output-available') {
      byName[names.get(chunk.toolCallId) ?? '?'] = chunk.output
    }
  }
  return byName
}

async function run(
  doStream: StreamResult[],
  limits?: Parameters<typeof createStoreReply>[0]['limits'],
) {
  const model = new MockLanguageModelV4({ doStream })
  const chunks = await collect(createStoreReply({ model, limits })(question))
  return { model, chunks }
}

describe('createStoreReply', () => {
  it('searches, shows cards and a store link, then answers', async () => {
    const picks = CATALOG.filter((m) => m.price <= 300).slice(0, 2)
    const { model, chunks } = await run([
      search({ maxPrice: 300 }),
      tools(
        call('show_machines', { slugs: picks.map((m) => m.slug) }),
        call('show_store_link', { maxPrice: 300 }),
      ),
      answer('Two budget heroes.'),
    ])

    expect(model.doStreamCalls).toHaveLength(3)
    expect(textOf(chunks)).toBe('Two budget heroes.')
    const shown = outputs(chunks)
    expect(shown.show_machines).toEqual({ ok: true, items: picks })
    expect(shown.show_store_link).toMatchObject({
      ok: true,
      filters: { maxPrice: 300 },
      sort: 'rating_desc',
    })
    expect(chunks.at(0)?.type).toBe('start')
    expect(chunks.at(-1)?.type).toBe('finish')
  })

  it('answers from the search result', async () => {
    const { model } = await run([search({ maxPrice: 300 }), answer('Picks.')])
    const [value] = toolResults(model) as [
      { ok: boolean; items: { price: number }[] },
    ]
    expect(value.ok).toBe(true)
    expect(value.items.length).toBeGreaterThan(0)
    expect(value.items.every((m) => m.price <= 300)).toBe(true)
  })

  it('offers the search and the two display tools', async () => {
    const { model } = await run([answer('Hi!')])
    const offered = model.doStreamCalls[0]?.tools ?? []
    expect(offered.map((t) => t.name).toSorted()).toEqual([
      'search_espresso_machines',
      'show_machines',
      'show_store_link',
    ])
    const byName = Object.fromEntries(offered.map((t) => [t.name, t]))
    const keys = (name: string) => {
      const t = byName[name]
      return t?.type === 'function'
        ? Object.keys(t.inputSchema.properties ?? {}).toSorted()
        : []
    }
    expect(keys('search_espresso_machines')).toEqual([
      'limit',
      'maxPrice',
      'minPrice',
      'minRating',
      'sort',
    ])
    expect(keys('show_machines')).toEqual(['slugs'])
    expect(keys('show_store_link')).toEqual([
      'maxPrice',
      'minPrice',
      'minRating',
      'sort',
    ])
  })

  it('sends the instructions and the conversation', async () => {
    const model = new MockLanguageModelV4({ doStream: [answer('Ciao!')] })
    await collect(
      createStoreReply({ model })([
        { role: 'user', text: 'Hi' },
        { role: 'assistant', text: 'Ciao!' },
        { role: 'user', text: 'Cheap ones?' },
      ]),
    )

    const prompt = model.doStreamCalls[0]?.prompt ?? []
    expect(prompt.map((m) => m.role)).toEqual([
      'system',
      'user',
      'assistant',
      'user',
    ])
    expect(prompt[0]?.content).toBe(INSTRUCTIONS)
    expect(INSTRUCTIONS).toContain(OFF_TOPIC_REPLY)
  })

  it('hands rule-breaking filters back to the model as errors', async () => {
    const { model } = await run([
      search({ minPrice: 900, maxPrice: 100 }),
      answer('Let me fix that.'),
    ])
    expect(toolResults(model)).toEqual([
      {
        ok: false,
        errors: [
          { field: 'maxPrice', message: 'minPrice must not exceed maxPrice' },
        ],
      },
    ])
  })

  it('refuses to show a machine the store does not sell', async () => {
    const real = CATALOG[0].slug
    const { model } = await run([
      tools(call('show_machines', { slugs: [real, 'gaggia-imaginary'] })),
      answer('Oops.'),
    ])
    expect(toolResults(model)).toEqual([
      {
        ok: false,
        errors: [
          {
            field: 'slugs',
            message:
              'No machine with slug "gaggia-imaginary". Use slugs from search results only.',
          },
        ],
      },
    ])
  })

  it('shows each machine once, in the order given', async () => {
    const [a, b] = CATALOG
    const { chunks } = await run([
      tools(call('show_machines', { slugs: [b.slug, a.slug, b.slug] })),
      answer('Here.'),
    ])
    expect(outputs(chunks).show_machines).toEqual({ ok: true, items: [b, a] })
  })

  it('stops after the step limit and still says something', async () => {
    const { model, chunks } = await run(
      [search({}), search({}), search({}), answer('x')],
      { maxSteps: 2 },
    )
    expect(model.doStreamCalls).toHaveLength(2)
    expect(textOf(chunks)).toBe(EMPTY_REPLY)
  })

  it('counts cards as an answer, without the fallback text', async () => {
    const { chunks } = await run(
      [tools(call('show_machines', { slugs: [CATALOG[0].slug] })), answer('')],
      { maxSteps: 1 },
    )
    expect(textOf(chunks)).toBe('')
  })

  it('passes the output token cap to every call', async () => {
    const { model } = await run([answer('Hi!')], { maxOutputTokens: 123 })
    expect(model.doStreamCalls[0]?.maxOutputTokens).toBe(123)
  })

  it('never answers with empty text', async () => {
    const { chunks } = await run([answer('   ')])
    expect(textOf(chunks)).toBe(`   ${EMPTY_REPLY}`)
  })

  it('streams upstream failures as a generic error', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => {})
    try {
      const model = new MockLanguageModelV4({
        doStream: () => {
          throw new Error('quota exceeded for key AIza-secret')
        },
      })
      const chunks = await collect(
        createStoreReply({ model, limits: { timeoutMs: 1000 } })(question),
      )
      const errors = chunks.filter((c) => c.type === 'error')
      expect(errors).toEqual([{ type: 'error', errorText: GENERIC_ERROR }])
      expect(JSON.stringify(chunks)).not.toContain('AIza')
      expect(textOf(chunks)).toBe('')
      expect(log).toHaveBeenCalled()
    } finally {
      log.mockRestore()
    }
  })
})

describe('agentConfigFromEnv', () => {
  it('keeps the placeholder reply without a key', () => {
    expect(agentConfigFromEnv({})).toEqual({})
    expect(agentConfigFromEnv({ GOOGLE_GENERATIVE_AI_API_KEY: '  ' })).toEqual(
      {},
    )
  })

  it('wires the model when a key is set', () => {
    const config = agentConfigFromEnv({
      GOOGLE_GENERATIVE_AI_API_KEY: 'test-key',
    })
    expect(typeof config.reply).toBe('function')
  })
})
