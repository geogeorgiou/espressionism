import { vi } from 'vite-plus/test'

import { useWebMcpStore } from '@/features/webmcp/stores/webmcp-store'

/**
 * Gives jsdom a fake `document.modelContext` that tracks live registrations
 * (a tool drops out when its signal aborts). Call `restore` in afterEach.
 */
export function stubModelContext() {
  const tools = new Map<string, WebMCP.ModelContextTool>()
  const registerTool = vi.fn(
    async (
      tool: WebMCP.ModelContextTool,
      options: WebMCP.ModelContextRegisterToolOptions = {},
    ) => {
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
  useWebMcpStore.setState({ tools: {}, supported: false, invokedAt: {} })
}

export function fakeTool(
  name: string,
  execute: WebMCP.ToolExecuteCallback = () => 'ok',
): WebMCP.ModelContextTool {
  return { name, description: `The ${name} tool`, execute }
}
