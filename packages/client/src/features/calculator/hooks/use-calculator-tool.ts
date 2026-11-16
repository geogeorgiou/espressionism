import { CALCULATOR_TOOL, fill } from '@espressionism/calculator'

import { useWebMcpTool } from '@/features/webmcp/hooks/use-webmcp-tool'
import type { WebMcpStatus } from '@/features/webmcp/stores/webmcp-store'
import { useWebMcpStore } from '@/features/webmcp/stores/webmcp-store'

import type { CalculatorValues } from '../constants'
import { AGENT_FILL_INPUT_SCHEMA } from '../constants'

export const CALCULATOR_TOOL_NAME = CALCULATOR_TOOL.name

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
 * Returns the tool's WebMCP status.
 */
export function useCalculatorTool({
  getValues,
  setValue,
}: CalculatorFormHandle): WebMcpStatus {
  return useWebMcpTool({
    ...CALCULATOR_TOOL,
    inputSchema: AGENT_FILL_INPUT_SCHEMA,
    annotations: ANNOTATIONS,
    execute: (input) => {
      const output = fill(getValues(), input)
      if (!output.ok) return output
      for (const name of Object.keys(output.changes) as FieldName[]) {
        setValue(name, output.values[name])
      }
      useWebMcpStore.getState().recordInvocation(CALCULATOR_TOOL_NAME)
      const { changes: _changes, ...result } = output
      return result
    },
  })
}
