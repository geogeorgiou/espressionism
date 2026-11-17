import { DEFAULT_INPUTS, analyze, fillTool } from '@espressionism/calculator'
import {
  act,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { CalculatorForm } from '@/features/calculator/components/CalculatorForm'
import type { CalculatorValues } from '@/features/calculator/constants'
import type { CalculatorUrl } from '@/features/calculator/hooks/use-calculator'
import { useCalculator } from '@/features/calculator/hooks/use-calculator'

import { resetWebMcpStore, stubModelContext } from '../../webmcp/model-context'

/** A URL holding `search`, recording what the hook saves into it. */
function fakeUrl(search: Partial<CalculatorValues> = {}) {
  const save = vi.fn<CalculatorUrl['save']>()
  return { url: { search, save }, save }
}

/** A successful fill of these fields onto the defaults. */
function fillOf(input: Partial<CalculatorValues>) {
  const fill = fillTool.run(input, { current: DEFAULT_INPUTS })
  if (!fill.ok) throw new Error('fill should succeed')
  return fill
}

describe('useCalculator', () => {
  afterEach(resetWebMcpStore)

  it('starts from the URL over the defaults', () => {
    const { url } = fakeUrl({ cupsPerDay: 3 })
    const { result } = renderHook(() => useCalculator(url))
    const values = { ...DEFAULT_INPUTS, cupsPerDay: 3 }
    expect(result.current.values).toEqual(values)
    expect(result.current.analysis).toEqual(analyze(values))
    expect(result.current.agentFills).toBe(0)
  })

  it('shows the URL values while a field is invalid, and saves only valid ones', async () => {
    const user = userEvent.setup()
    const { url, save } = fakeUrl({ cupsPerDay: 3 })
    const { result } = renderHook(() => useCalculator(url))
    // Form listeners run through mounted fields, as on the page.
    render(<CalculatorForm form={result.current.form} />)
    const days = screen.getByLabelText('Days a week')

    await user.clear(days)
    await user.type(days, '9')
    expect(result.current.values.daysPerWeek).toBe(DEFAULT_INPUTS.daysPerWeek)
    expect(result.current.chat.getValues()).toBe(undefined)

    await user.clear(days)
    await user.type(days, '6')
    await waitFor(() =>
      expect(save).toHaveBeenLastCalledWith({
        ...DEFAULT_INPUTS,
        cupsPerDay: 3,
        daysPerWeek: 6,
      }),
    )
    // Debounced: one save for the whole burst, with the valid values.
    expect(save).toHaveBeenCalledTimes(1)
  })

  it("puts Robospresso's fill on the form and marks it agent-filled", () => {
    const { url } = fakeUrl()
    const { result } = renderHook(() => useCalculator(url))
    act(() => result.current.chat.apply(fillOf({ cupsPerDay: 2 })))
    expect(result.current.values.cupsPerDay).toBe(2)
    expect(result.current.agentFills).toBe(1)
    // Each fill counts, so the verdict panel's hop replays.
    act(() => result.current.chat.apply(fillOf({ cupsPerDay: 3 })))
    expect(result.current.agentFills).toBe(2)
  })

  it("puts a visitor's agent's WebMCP fill on the form the same way", async () => {
    const stub = stubModelContext()
    try {
      const { result } = renderHook(() => useCalculator(fakeUrl().url))
      await waitFor(() => expect(stub.tools.has(fillTool.name)).toBe(true))
      const tool = stub.tools.get(fillTool.name)
      let answer: unknown
      await act(async () => {
        answer = await tool?.execute({ cupsPerDay: 4 }, {} as never)
      })
      expect(answer).toMatchObject({ ok: true, changes: { cupsPerDay: 4 } })
      expect(result.current.values.cupsPerDay).toBe(4)
      expect(result.current.agentFills).toBe(1)
    } finally {
      stub.restore()
    }
  })
})
