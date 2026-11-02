import { describe, expect, it } from 'vite-plus/test'

import { AGENT_FILL_INPUT_SCHEMA } from '@/features/calculator/constants'

describe('AGENT_FILL_INPUT_SCHEMA', () => {
  const schema = AGENT_FILL_INPUT_SCHEMA as {
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
