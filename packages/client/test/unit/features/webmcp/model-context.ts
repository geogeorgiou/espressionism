import { vi } from 'vite-plus/test'

import { useWebMcpStore } from '@/features/webmcp/stores/webmcp-store'

/**
 * Gives jsdom a fake `document.modelContext` that behaves like the spec: a
 * name can be registered once (a duplicate rejects with InvalidStateError)
 * and a tool drops out when its signal aborts. Call `restore` afterwards.
 */
export function stubModelContext() {
  const tools = new Map<string, WebMCP.ModelContextTool>()
  const registerTool = vi.fn(
    async (
      tool: WebMCP.ModelContextTool,
      options: WebMCP.ModelContextRegisterToolOptions = {},
    ) => {
      if (tools.has(tool.name)) {
        throw new DOMException(`Duplicate ${tool.name}`, 'InvalidStateError')
      }
      tools.set(tool.name, tool)
      options.signal?.addEventListener('abort', () => {
        if (tools.get(tool.name) === tool) tools.delete(tool.name)
      })
    },
  )
  Object.defineProperty(document, 'modelContext', {
    configurable: true,
    value: { registerTool },
  })
  return {
    tools,
    registerTool,
    restore: () => Reflect.deleteProperty(document, 'modelContext'),
  }
}

export function resetWebMcpStore() {
  useWebMcpStore.setState({ statuses: {}, invokedAt: {} })
}

export function fakeTool(
  name: string,
  execute: WebMCP.ToolExecuteCallback = () => 'ok',
): WebMCP.ModelContextTool {
  return { name, description: `The ${name} tool`, execute }
}
