import { afterEach, describe, expect, it } from 'vite-plus/test'

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
