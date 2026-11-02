import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vite-plus/test'

import { useWebMcpTool } from '@/features/webmcp/hooks/use-webmcp-tool'
import { useWebMcpStore } from '@/features/webmcp/stores/webmcp-store'
import { startModelContextSync } from '@/features/webmcp/utils/model-context'

import { fakeTool, resetWebMcpStore, stubModelContext } from '../model-context'

describe('useWebMcpTool', () => {
  afterEach(() => {
    resetWebMcpStore()
  })

  it('registers a single time under Strict Mode', async () => {
    const stub = stubModelContext()
    const stop = startModelContextSync()
    try {
      const tool = fakeTool('calc')
      const { unmount } = renderHook(() => useWebMcpTool(tool), {
        reactStrictMode: true,
      })
      // Let the cancelled removal's timer slot pass.
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(stub.registerTool).toHaveBeenCalledTimes(1)
      expect([...stub.tools.keys()]).toEqual(['calc'])

      unmount()
      await waitFor(() => expect(stub.tools.size).toBe(0))
      expect(useWebMcpStore.getState().tools).toEqual({})
    } finally {
      stop()
      stub.restore()
    }
  })

  it('calls the latest execute without re-registering', async () => {
    const stub = stubModelContext()
    const stop = startModelContextSync()
    try {
      const { rerender } = renderHook(
        ({ answer }) =>
          useWebMcpTool({ ...fakeTool('calc'), execute: () => answer }),
        { initialProps: { answer: 'first' } },
      )
      rerender({ answer: 'second' })
      const registered = stub.tools.get('calc')
      const result = await registered?.execute(
        {},
        { signal: new AbortController().signal },
      )
      expect(result).toBe('second')
      expect(stub.registerTool).toHaveBeenCalledTimes(1)
    } finally {
      stop()
      stub.restore()
    }
  })
})
