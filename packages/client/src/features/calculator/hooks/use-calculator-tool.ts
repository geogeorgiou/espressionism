import { useWebMcpTool } from '@/features/webmcp/hooks/use-webmcp-tool'
import { useWebMcpStore } from '@/features/webmcp/stores/webmcp-store'

import type { CalculatorValues } from '../constants'
import { AGENT_FILL_INPUT_SCHEMA } from '../constants'
import { agentFillResult, applyAgentFill } from '../utils/agent-fill'

export const CALCULATOR_TOOL_NAME = 'fill_calculator'

const ANNOTATIONS: WebMCP.ToolAnnotations = {
  readOnlyHint: false,
  untrustedContentHint: false,
  consequentialHint: false,
  debugging: false,
}

type FieldName = keyof CalculatorValues

interface CalculatorFormHandle {
  getValues: () => CalculatorValues
  setValue: (name: FieldName, value: CalculatorValues[FieldName]) => void
}

/**
 * Registers `fill_calculator`: an agent sends any subset of the fields, they
 * land on the form as if typed (validation, URL sync), and the tool returns
 * the result. Invalid input changes nothing and returns the errors.
 */
export function useCalculatorTool({
  getValues,
  setValue,
}: CalculatorFormHandle) {
  useWebMcpTool({
    name: CALCULATOR_TOOL_NAME,
    title: 'Fill the calculator',
    description:
      "Fill in the espresso machine break-even calculator with the user's coffee habit and machine costs, then return the result: break-even, totals and a verdict. Send only the fields you know; the rest keep their current values.",
    inputSchema: AGENT_FILL_INPUT_SCHEMA,
    annotations: ANNOTATIONS,
    execute: (input) => {
      const fill = applyAgentFill(getValues(), input)
      if (!fill.ok) return fill
      for (const name of Object.keys(fill.changes) as FieldName[]) {
        setValue(name, fill.values[name])
      }
      useWebMcpStore.getState().recordInvocation(CALCULATOR_TOOL_NAME)
      return agentFillResult(fill.values)
    },
  })
}
