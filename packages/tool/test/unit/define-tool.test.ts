import { describe, expect, expectTypeOf, it } from 'vite-plus/test'
import { z } from 'zod'

import type { ToolContext, ToolOutput } from '../../src'
import { defineTool, toolFailure, toolFailureSchema } from '../../src'

const add = defineTool({
  name: 'add_cups',
  title: 'Add cups',
  description: 'Adds cups to the ones already poured.',
  input: z
    .object({
      cups: z.number().int().min(1).meta({ description: 'Cups to add.' }),
      max: z.number().int().optional().meta({ description: 'Upper bound.' }),
    })
    .strict(),
  output: z.object({ total: z.number() }),
  run: ({ cups, max }, { poured }: { poured: number }) => {
    const total = poured + cups
    if (max !== undefined && total > max) {
      return toolFailure([{ path: ['cups'], message: `More than ${max}` }])
    }
    return { total }
  },
})

const ping = defineTool({
  name: 'ping',
  title: 'Ping',
  description: 'Answers pong.',
  input: z.object({}).strict(),
  output: z.object({ reply: z.literal('pong') }),
  run: () => ({ reply: 'pong' as const }),
})

describe('defineTool', () => {
  it('runs valid input with its context and adds ok: true', () => {
    expect(add.run({ cups: 2 }, { poured: 3 })).toEqual({ ok: true, total: 5 })
  })

  it('treats missing input as an empty object', () => {
    expect(ping.run(undefined)).toEqual({ ok: true, reply: 'pong' })
    expect(add.run(undefined, { poured: 0 })).toEqual({
      ok: false,
      errors: [{ field: 'cups', message: expect.any(String) }],
    })
  })

  it('maps schema issues to fields, and unknown keys or non-objects to "input"', () => {
    const output = add.run({ cups: 1.5, sugar: 2 }, { poured: 0 })
    expect(output.ok).toBe(false)
    if (output.ok) return
    expect(output.errors.map((e) => e.field).toSorted()).toEqual([
      'cups',
      'input',
    ])
    expect(ping.run('hello')).toMatchObject({
      ok: false,
      errors: [{ field: 'input' }],
    })
  })

  it('passes on failures the tool returns for its own rules', () => {
    expect(add.run({ cups: 3, max: 4 }, { poured: 2 })).toEqual({
      ok: false,
      errors: [{ field: 'cups', message: 'More than 4' }],
    })
  })

  it('describes both answers with its output schema', () => {
    const success = add.run({ cups: 1 }, { poured: 1 })
    const failure = add.run({ cups: 0 }, { poured: 1 })
    expect(add.outputSchema.parse(success)).toEqual(success)
    expect(add.outputSchema.parse(failure)).toEqual(failure)
    expect(toolFailureSchema.safeParse(failure).success).toBe(true)
    expect(add.outputSchema.safeParse({ ok: true }).success).toBe(false)
  })

  it('builds the JSON Schema once, with every description', () => {
    const schema = add.jsonSchema as {
      properties: Record<string, { description?: string }>
      additionalProperties: unknown
    }
    expect(add.jsonSchema).toBe(add.jsonSchema)
    expect(schema.properties.cups.description).toBe('Cups to add.')
    expect(schema.additionalProperties).toBe(false)
  })

  it('types the context and output from the definition', () => {
    expectTypeOf<ToolContext<typeof add>>().toEqualTypeOf<{ poured: number }>()
    expectTypeOf<ToolContext<typeof ping>>().toEqualTypeOf<undefined>()
    expectTypeOf<Extract<ToolOutput<typeof add>, { ok: true }>>()
      .toHaveProperty('total')
      .toEqualTypeOf<number>()
  })
})

describe('toolFailure', () => {
  it('joins nested paths and reports pathless issues against input', () => {
    expect(
      toolFailure([
        { path: ['filters', 'maxPrice'], message: 'Too low' },
        { path: [], message: 'Bad' },
      ]),
    ).toEqual({
      ok: false,
      errors: [
        { field: 'filters.maxPrice', message: 'Too low' },
        { field: 'input', message: 'Bad' },
      ],
    })
  })
})
