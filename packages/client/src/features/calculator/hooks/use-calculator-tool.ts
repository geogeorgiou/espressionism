import { fillTool } from '@espressionism/calculator'

import { useWebMcpTool } from '@/features/webmcp/hooks/use-webmcp-tool'
import type { WebMcpStatus } from '@/features/webmcp/stores/webmcp-store'

import type { CalculatorValues } from '../constants'

export const CALCULATOR_TOOL_NAME = fillTool.name

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
  return useWebMcpTool(fillTool, {
    annotations: ANNOTATIONS,
    context: () => ({ current: getValues() }),
    onResult: ({ changes, values }) => {
      for (const name of Object.keys(changes) as FieldName[]) {
        setValue(name, values[name])
      }
    },
  })
}
