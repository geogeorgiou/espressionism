import { afterEach, describe, expect, it, vi } from 'vite-plus/test'

import { useWebMcpStore } from '@/features/webmcp/stores/webmcp-store'
import { startModelContextSync } from '@/features/webmcp/utils/model-context'

import { fakeTool, resetWebMcpStore, stubModelContext } from '../model-context'

describe('startModelContextSync', () => {
  afterEach(() => {
    resetWebMcpStore()
  })

  it('marks WebMCP unsupported when the browser has no modelContext', () => {
    const stop = startModelContextSync()
    expect(useWebMcpStore.getState().supported).toBe(false)
    stop()
  })

  it('registers tools already in the store and ones added later', () => {
    const stub = stubModelContext()
    try {
      useWebMcpStore.getState().addTool(fakeTool('first'))
      const stop = startModelContextSync()
      expect(useWebMcpStore.getState().supported).toBe(true)
      expect([...stub.tools.keys()]).toEqual(['first'])

      useWebMcpStore.getState().addTool(fakeTool('second'))
      expect([...stub.tools.keys()]).toEqual(['first', 'second'])
      stop()
    } finally {
      stub.restore()
    }
  })

  it('unregisters a removed tool by aborting its signal', () => {
    const stub = stubModelContext()
    try {
      const stop = startModelContextSync()
      useWebMcpStore.getState().addTool(fakeTool('gone'))
      useWebMcpStore.getState().removeTool('gone')
      expect(stub.tools.size).toBe(0)
      stop()
    } finally {
      stub.restore()
    }
  })

  it('re-registers a tool replaced under the same name', () => {
    const stub = stubModelContext()
    try {
      const stop = startModelContextSync()
      useWebMcpStore.getState().addTool(fakeTool('calc'))
      const replacement = fakeTool('calc', () => 'new')
      useWebMcpStore.getState().addTool(replacement)
      expect(stub.registerTool).toHaveBeenCalledTimes(2)
      expect(stub.tools.get('calc')).toBe(replacement)
      stop()
    } finally {
      stub.restore()
    }
  })

  it('stays quiet when its own unregister rejects a pending registration', async () => {
    const stub = stubModelContext()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      // Per spec, aborting before the registration settles rejects it.
      stub.registerTool.mockImplementation(
        (_tool, options = {}) =>
          new Promise((_resolve, reject) => {
            options.signal?.addEventListener('abort', () =>
              reject(options.signal?.reason),
            )
          }),
      )
      const stop = startModelContextSync()
      useWebMcpStore.getState().addTool(fakeTool('calc'))
      useWebMcpStore.getState().removeTool('calc')
      await Promise.resolve()
      expect(warn).not.toHaveBeenCalled()
      stop()
    } finally {
      warn.mockRestore()
      stub.restore()
    }
  })

  it('warns when the browser refuses a registration', async () => {
    const stub = stubModelContext()
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    try {
      const refusal = new DOMException('Duplicate tool', 'InvalidStateError')
      stub.registerTool.mockRejectedValueOnce(refusal)
      const stop = startModelContextSync()
      useWebMcpStore.getState().addTool(fakeTool('calc'))
      await vi.waitFor(() =>
        expect(warn).toHaveBeenCalledWith(
          'WebMCP: couldn\'t register "calc"',
          refusal,
        ),
      )
      stop()
    } finally {
      warn.mockRestore()
      stub.restore()
    }
  })

  it('unregisters everything on cleanup and stops listening', () => {
    const stub = stubModelContext()
    try {
      useWebMcpStore.getState().addTool(fakeTool('calc'))
      const stop = startModelContextSync()
      stop()
      expect(stub.tools.size).toBe(0)

      useWebMcpStore.getState().addTool(fakeTool('late'))
      expect(stub.tools.size).toBe(0)
    } finally {
      stub.restore()
    }
  })
})
