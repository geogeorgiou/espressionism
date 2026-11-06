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

describe('store paths', () => {
  it('are not caught by the catch-all', async () => {
    const location = await landOn('/store?minRating=4')
    expect(location.pathname).toBe('/store')
    expect(location.search).toEqual({ minRating: 4 })
    expect((await landOn('/store/gaggia-touch-lux')).pathname).toBe(
      '/store/gaggia-touch-lux',
    )
  })

  it('keep an unknown product at its URL for the not-found screen', async () => {
    expect((await landOn('/store/no-such-machine')).pathname).toBe(
      '/store/no-such-machine',
    )
  })
})
