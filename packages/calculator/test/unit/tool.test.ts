import { describe, expect, it } from 'vite-plus/test'

import { analyze } from '../../src/analyze'
import type { CalculatorValues } from '../../src/schema'
import { DEFAULT_INPUTS } from '../../src/schema'
import { fillTool } from '../../src/tool'

const fill = (current: CalculatorValues, input: unknown) =>
  fillTool.run(input, { current })

describe('fillTool.run', () => {
  it('merges the sent fields onto the current values and analyzes them', () => {
    const output = fill(DEFAULT_INPUTS, { cupsPerDay: 2, machinePrice: 450 })
    const values = { ...DEFAULT_INPUTS, cupsPerDay: 2, machinePrice: 450 }
    const { summary, verdict, message } = analyze(values)
    // Only the verdict and its sentence: the page's copy and charts stay home.
    expect(output).toEqual({
      ok: true,
      changes: { cupsPerDay: 2, machinePrice: 450 },
      values,
      summary,
      verdict,
      message,
    })
    // 2 lattes × 5 days at €3.50 against €0.45 at home: a €450 machine
    // pays for itself well inside a year.
    expect(output.ok && output.verdict).toBe('fast')
  })

  it('matches its output schema', () => {
    const output = fill(DEFAULT_INPUTS, { drink: 'mocha' })
    expect(fillTool.outputSchema.parse(output)).toEqual(output)
    const failure = fill(DEFAULT_INPUTS, { years: 0 })
    expect(fillTool.outputSchema.parse(failure)).toEqual(failure)
  })

  it('treats a missing input as an empty fill', () => {
    expect(fill(DEFAULT_INPUTS, undefined)).toMatchObject({
      ok: true,
      changes: {},
      values: DEFAULT_INPUTS,
    })
  })

  it('reports out-of-range values with the form messages', () => {
    expect(fill(DEFAULT_INPUTS, { daysPerWeek: 9 })).toEqual({
      ok: false,
      errors: [{ field: 'daysPerWeek', message: 'A week has seven days' }],
    })
  })

  it('rejects unknown fields and wrong types', () => {
    const output = fill(DEFAULT_INPUTS, { cafePrice: '4', sugar: 2 })
    expect(output.ok).toBe(false)
    if (output.ok) return
    expect(new Set(output.errors.map((e) => e.field))).toEqual(
      new Set(['cafePrice', 'input']),
    )
  })

  it('rejects a free café drink', () => {
    expect(fill(DEFAULT_INPUTS, { cafePrice: 0 })).toEqual({
      ok: false,
      errors: [
        { field: 'cafePrice', message: 'Café price must be above zero' },
      ],
    })
  })

  it('flags a field the agent left alone if the form has it half-typed', () => {
    expect(
      fill({ ...DEFAULT_INPUTS, machinePrice: Number.NaN }, { years: 3 }),
    ).toEqual({
      ok: false,
      errors: [{ field: 'machinePrice', message: 'Machine price is required' }],
    })
  })
})

describe('the JSON Schema agents see', () => {
  const schema = fillTool.jsonSchema as {
    type: string
    required?: string[]
    additionalProperties: boolean
    properties: Record<string, Record<string, unknown>>
  }

  it('is an object with every field optional and no extras', () => {
    expect(schema.type).toBe('object')
    expect(schema.required).toBeUndefined()
    expect(schema.additionalProperties).toBe(false)
  })

  it('keeps the form limits', () => {
    const { properties } = schema
    expect(properties.drink?.enum).toEqual([
      'house',
      'latte',
      'mocha',
      'matcha',
      'cherry',
    ])
    expect(properties.currency?.enum).toEqual(['EUR', 'USD', 'GBP'])
    expect(properties.cafePrice).toMatchObject({
      type: 'number',
      exclusiveMinimum: 0,
      maximum: 50,
    })
    expect(properties.cupsPerDay).toMatchObject({
      type: 'integer',
      minimum: 1,
      maximum: 10,
    })
    expect(properties.daysPerWeek).toMatchObject({
      type: 'integer',
      minimum: 1,
      maximum: 7,
    })
    expect(properties.machinePrice).toMatchObject({
      minimum: 0,
      maximum: 20000,
    })
    expect(properties.homeCostPerCup).toMatchObject({ minimum: 0, maximum: 20 })
    expect(properties.yearlyMaintenance).toMatchObject({
      minimum: 0,
      maximum: 5000,
    })
    expect(properties.years).toMatchObject({
      type: 'integer',
      minimum: 1,
      maximum: 10,
    })
  })

  it('describes every field for the agent', () => {
    const undescribed = Object.entries(schema.properties)
      .filter(([, property]) => typeof property.description !== 'string')
      .map(([name]) => name)
    expect(undescribed).toEqual([])
    expect(schema.properties.drink?.description).toContain(
      'cherry (Seasonal special)',
    )
  })
})
