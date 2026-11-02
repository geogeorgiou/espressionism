import { useEffect, useRef } from 'react'

import { useWebMcpStore } from '../stores/webmcp-store'
import { startModelContextSync } from '../utils/model-context'

/** Mount once in the app shell: keeps `document.modelContext` in step. */
export function useModelContextSync() {
  useEffect(() => startModelContextSync(), [])
}

/**
 * Offers a WebMCP tool while the calling component is mounted.
 *
 * `execute` may change every render (it's read through a ref). The rest of
 * the definition is the tool's identity: keep `inputSchema` and
 * `annotations` stable (module constants), since changing them re-registers.
 */
export function useWebMcpTool(tool: WebMCP.ModelContextTool) {
  const executeRef = useRef(tool.execute)
  useEffect(() => {
    executeRef.current = tool.execute
  })

  const { name, title, description, inputSchema, annotations } = tool
  useEffect(() => {
    const { addTool, removeTool } = useWebMcpStore.getState()
    addTool({
      name,
      title,
      description,
      inputSchema,
      annotations,
      execute: (input, options) => executeRef.current(input, options),
    })
    return () => removeTool(name)
  }, [name, title, description, inputSchema, annotations])
}

/** When the named tool last finished a call successfully, or null. */
export function useToolInvokedAt(name: string): number | null {
  return useWebMcpStore((state) => state.invokedAt[name] ?? null)
}
