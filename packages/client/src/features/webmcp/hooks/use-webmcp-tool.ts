import { useEffect, useRef } from 'react'

import { useWebMcpStore } from '../stores/webmcp-store'
import { startModelContextSync } from '../utils/model-context'

/** Mount once in the app shell: keeps `document.modelContext` in step. */
export function useModelContextSync() {
  useEffect(() => startModelContextSync(), [])
}

type ToolIdentity = Omit<WebMCP.ModelContextTool, 'execute'>

function sameIdentity(a: ToolIdentity, b: ToolIdentity): boolean {
  return (
    a.name === b.name &&
    a.title === b.title &&
    a.description === b.description &&
    a.inputSchema === b.inputSchema &&
    a.annotations === b.annotations
  )
}

/**
 * Offers a WebMCP tool while the calling component is mounted, registering
 * it a single time.
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

  // Guard against double registration: what's registered now, and a removal
  // the cleanup scheduled. Strict Mode runs effect → cleanup → effect; the
  // second run cancels the pending removal instead of registering again, and
  // a real unmount lets it fire.
  const registeredRef = useRef<ToolIdentity | null>(null)
  const pendingRemovalRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const { name, title, description, inputSchema, annotations } = tool
  useEffect(() => {
    const identity = { name, title, description, inputSchema, annotations }
    const { addTool, removeTool } = useWebMcpStore.getState()

    if (pendingRemovalRef.current !== null) {
      clearTimeout(pendingRemovalRef.current)
      pendingRemovalRef.current = null
    }
    const registered = registeredRef.current
    if (registered && !sameIdentity(registered, identity)) {
      removeTool(registered.name)
      registeredRef.current = null
    }
    if (!registeredRef.current) {
      addTool({
        ...identity,
        execute: (input, options) => executeRef.current(input, options),
      })
      registeredRef.current = identity
    }

    return () => {
      pendingRemovalRef.current = setTimeout(() => {
        pendingRemovalRef.current = null
        registeredRef.current = null
        removeTool(name)
      }, 0)
    }
  }, [name, title, description, inputSchema, annotations])
}

/** When the named tool last finished a call successfully, or null. */
export function useToolInvokedAt(name: string): number | null {
  return useWebMcpStore((state) => state.invokedAt[name] ?? null)
}
