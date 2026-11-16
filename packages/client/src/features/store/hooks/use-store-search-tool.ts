import { searchTool } from '@espressionism/store'

import { useWebMcpTool } from '@/features/webmcp/hooks/use-webmcp-tool'
import type { WebMcpStatus } from '@/features/webmcp/stores/webmcp-store'

import type { StoreFormValues } from '../constants'
import { agentSearchToForm } from '../utils/query'

const ANNOTATIONS: WebMCP.ToolAnnotations = {
  // It changes what the page shows, never any data.
  readOnlyHint: true,
  untrustedContentHint: false,
  consequentialHint: false,
  debugging: false,
}

/**
 * Registers `search_espresso_machines` on the store page. The definition is
 * the store's shared one, so a visitor's agent and Robospresso get the same
 * answers. A valid search also sets the filters, so the visitor sees what
 * their agent found. Returns the tool's WebMCP status.
 */
export function useStoreSearchTool({
  setFilters,
}: {
  setFilters: (values: StoreFormValues) => void
}): WebMcpStatus {
  return useWebMcpTool(searchTool, {
    annotations: ANNOTATIONS,
    onResult: (result) => setFilters(agentSearchToForm(result)),
  })
}
