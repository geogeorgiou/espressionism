import { SEARCH_TOOL, runStoreSearch } from '@espressionism/store'

import { useWebMcpTool } from '@/features/webmcp/hooks/use-webmcp-tool'
import type { WebMcpStatus } from '@/features/webmcp/stores/webmcp-store'
import { useWebMcpStore } from '@/features/webmcp/stores/webmcp-store'

import type { StoreFormValues } from '../constants'
import { SEARCH_TOOL_INPUT_SCHEMA } from '../constants'
import { agentSearchToForm } from '../utils/query'

const ANNOTATIONS: WebMCP.ToolAnnotations = {
  // It changes what the page shows, never any data.
  readOnlyHint: true,
  untrustedContentHint: false,
  consequentialHint: false,
  debugging: false,
}

/**
 * Registers `search_espresso_machines` on the store page. The definition and
 * validation are the store's shared ones, so a visitor's agent and
 * Robospresso get the same answers. A valid search also sets the filters, so
 * the visitor sees what their agent found. Returns the tool's WebMCP status.
 */
export function useStoreSearchTool({
  setFilters,
}: {
  setFilters: (values: StoreFormValues) => void
}): WebMcpStatus {
  return useWebMcpTool({
    ...SEARCH_TOOL,
    inputSchema: SEARCH_TOOL_INPUT_SCHEMA,
    annotations: ANNOTATIONS,
    execute: (input) => {
      const result = runStoreSearch(input)
      if (!result.ok) return result
      setFilters(agentSearchToForm(result))
      useWebMcpStore.getState().recordInvocation(SEARCH_TOOL.name)
      return result
    },
  })
}
