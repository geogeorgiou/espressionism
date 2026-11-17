import { defineTool, toolFailure } from '@espressionism/tool'
import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vite-plus/test'
import { z } from 'zod'

import {
  useModelContextTool,
  useWebMcpTool,
} from '@/features/webmcp/hooks/use-webmcp-tool'
import { useWebMcpStore } from '@/features/webmcp/stores/webmcp-store'

import { fakeTool, resetWebMcpStore, stubModelContext } from '../model-context'

describe('useModelContextTool', () => {
  afterEach(() => {
    resetWebMcpStore()
    vi.restoreAllMocks()
  })

  it('is unavailable when the browser has no WebMCP', () => {
    const { result } = renderHook(() => useModelContextTool(fakeTool('calc')))
    expect(result.current).toBe('unavailable')
    expect(useWebMcpStore.getState().statuses).toEqual({ calc: 'unavailable' })
  })

  it('registers the tool and becomes available', async () => {
    const stub = stubModelContext()
    try {
      const { result } = renderHook(() => useModelContextTool(fakeTool('calc')))
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
      const { result } = renderHook(
        () => useModelContextTool(fakeTool('calc')),
        {
          reactStrictMode: true,
        },
      )
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
      const { result } = renderHook(() => useModelContextTool(fakeTool('calc')))
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
        useModelContextTool(fakeTool('calc')),
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
          useModelContextTool({
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

const pour = defineTool({
  name: 'pour_cups',
  title: 'Pour cups',
  description: 'Pours cups on top of the ones on the counter.',
  input: z
    .object({ cups: z.number().int().meta({ description: 'Cups to pour.' }) })
    .strict(),
  output: z.object({ total: z.number() }),
  run: ({ cups }, { counter }: { counter: number }) =>
    cups > 0
      ? { total: counter + cups }
      : toolFailure([{ path: ['cups'], message: 'Pour at least one' }]),
})

const ANNOTATIONS: WebMCP.ToolAnnotations = { readOnlyHint: true }

async function registered(counter: () => number, onResult = vi.fn()) {
  const stub = stubModelContext()
  const { result } = renderHook(() =>
    useWebMcpTool(pour, {
      annotations: ANNOTATIONS,
      context: () => ({ counter: counter() }),
      onResult,
    }),
  )
  await waitFor(() => expect(result.current).toBe('available'))
  const tool = stub.tools.get(pour.name)
  if (!tool) throw new Error('tool not registered')
  return { stub, tool, onResult }
}

const signal = new AbortController().signal

describe('useWebMcpTool', () => {
  afterEach(() => {
    resetWebMcpStore()
    vi.restoreAllMocks()
  })

  it('registers the definition with its JSON Schema', async () => {
    const { stub, tool } = await registered(() => 0)
    try {
      expect(tool.title).toBe('Pour cups')
      expect(tool.description).toBe(pour.description)
      expect(tool.inputSchema).toBe(pour.jsonSchema)
      expect(tool.annotations).toBe(ANNOTATIONS)
    } finally {
      stub.restore()
    }
  })

  it('runs with the context at call time, then hands the result to the page', async () => {
    let counter = 1
    const { stub, tool, onResult } = await registered(() => counter)
    try {
      counter = 4
      const output = await tool.execute({ cups: 2 }, { signal })
      expect(output).toEqual({ ok: true, total: 6 })
      expect(onResult).toHaveBeenCalledWith({ ok: true, total: 6 })
    } finally {
      stub.restore()
    }
  })

  it('returns failures to the agent and leaves the page alone', async () => {
    const { stub, tool, onResult } = await registered(() => 0)
    try {
      expect(await tool.execute({ cups: 0 }, { signal })).toEqual({
        ok: false,
        errors: [{ field: 'cups', message: 'Pour at least one' }],
      })
      expect(await tool.execute({ cups: 'two' }, { signal })).toMatchObject({
        ok: false,
        errors: [{ field: 'cups' }],
      })
      expect(onResult).not.toHaveBeenCalled()
    } finally {
      stub.restore()
    }
  })
})
