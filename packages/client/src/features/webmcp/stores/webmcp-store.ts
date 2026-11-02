import { create } from 'zustand'

/**
 * Registry of the WebMCP tools the page offers right now. Components add and
 * remove tools here; `startModelContextSync` mirrors them to the browser.
 */
interface WebMcpState {
  tools: Record<string, WebMCP.ModelContextTool>
  /** Whether the browser exposes `document.modelContext`. */
  supported: boolean
  /** When each tool last finished a call successfully, by tool name. */
  invokedAt: Record<string, number>
  addTool: (tool: WebMCP.ModelContextTool) => void
  removeTool: (name: string) => void
  setSupported: (supported: boolean) => void
  recordInvocation: (name: string) => void
}

export const useWebMcpStore = create<WebMcpState>()((set) => ({
  tools: {},
  supported: false,
  invokedAt: {},
  addTool: (tool) =>
    set((state) => ({ tools: { ...state.tools, [tool.name]: tool } })),
  removeTool: (name) =>
    set((state) => {
      const { [name]: _removed, ...tools } = state.tools
      return { tools }
    }),
  setSupported: (supported) => set({ supported }),
  recordInvocation: (name) =>
    set((state) => ({ invokedAt: { ...state.invokedAt, [name]: Date.now() } })),
}))
