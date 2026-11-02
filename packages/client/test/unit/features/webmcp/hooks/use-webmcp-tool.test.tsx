import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { useWebMcpTool } from '@/features/webmcp/hooks/use-webmcp-tool'
import { useWebMcpStore } from '@/features/webmcp/stores/webmcp-store'

import { fakeTool, resetWebMcpStore, stubModelContext } from '../model-context'

describe('useWebMcpTool', () => {
  afterEach(() => {
    resetWebMcpStore()
    vi.restoreAllMocks()
  })

  it('is unavailable when the browser has no WebMCP', () => {
    const { result } = renderHook(() => useWebMcpTool(fakeTool('calc')))
    expect(result.current).toBe('unavailable')
    expect(useWebMcpStore.getState().statuses).toEqual({ calc: 'unavailable' })
  })

  it('registers the tool and becomes available', async () => {
    const stub = stubModelContext()
    try {
      const { result } = renderHook(() => useWebMcpTool(fakeTool('calc')))
      expect(result.current).toBe('checking')
      await waitFor(() => expect(result.current).toBe('available'))
      expect(stub.registerTool).toHaveBeenCalledTimes(1)
      expect([...stub.tools.keys()]).toEqual(['calc'])
    } finally {
      stub.restore()
    }
  })

  it('keeps one live registration under Strict Mode, without warnings', async () => {
    const stub = stubModelContext()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const { result } = renderHook(() => useWebMcpTool(fakeTool('calc')), {
        reactStrictMode: true,
      })
      await waitFor(() => expect(result.current).toBe('available'))
      // The first run's registration was aborted before the second one.
      expect(stub.tools.size).toBe(1)
      expect(warn).not.toHaveBeenCalled()
    } finally {
      stub.restore()
    }
  })

  it('reports an error when the browser refuses the tool', async () => {
    const stub = stubModelContext()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const refusal = new DOMException('Bad schema', 'TypeError')
      stub.registerTool.mockRejectedValueOnce(refusal)
      const { result } = renderHook(() => useWebMcpTool(fakeTool('calc')))
      await waitFor(() => expect(result.current).toBe('error'))
      expect(warn).toHaveBeenCalledWith(
        'WebMCP: couldn\'t register "calc"',
        refusal,
      )
    } finally {
      stub.restore()
    }
  })

  it('unregisters and clears its status on unmount', async () => {
    const stub = stubModelContext()
    try {
      const { result, unmount } = renderHook(() =>
        useWebMcpTool(fakeTool('calc')),
      )
      await waitFor(() => expect(result.current).toBe('available'))
      unmount()
      expect(stub.tools.size).toBe(0)
      expect(useWebMcpStore.getState().statuses).toEqual({})
    } finally {
      stub.restore()
    }
  })

  it('calls the latest execute without re-registering', async () => {
    const stub = stubModelContext()
    try {
      const { result, rerender } = renderHook(
        ({ answer }) =>
          useWebMcpTool({
            ...fakeTool('calc'),
            execute: () => answer,
          }),
        { initialProps: { answer: 'first' } },
      )
      await waitFor(() => expect(result.current).toBe('available'))
      rerender({ answer: 'second' })
      const output = await stub.tools
        .get('calc')
        ?.execute({}, { signal: new AbortController().signal })
      expect(output).toBe('second')
      expect(stub.registerTool).toHaveBeenCalledTimes(1)
    } finally {
      stub.restore()
    }
  })
})
