import { createMemoryHistory, createRouter } from '@tanstack/react-router'
import { describe, expect, it } from 'vite-plus/test'

import { routeTree } from '@/routeTree.gen'

async function landOn(path: string) {
  const router = createRouter({
    routeTree,
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  await router.load()
  return router.state.location
}

describe('unknown paths', () => {
  it('redirect to the calculator', async () => {
    expect((await landOn('/does-not-exist')).pathname).toBe('/')
    expect((await landOn('/a/deep/path?x=1')).pathname).toBe('/')
  })

  it('leave the calculator itself alone', async () => {
    const location = await landOn('/?machinePrice=900')
    expect(location.pathname).toBe('/')
    expect(location.search).toEqual({ machinePrice: 900 })
  })
})
