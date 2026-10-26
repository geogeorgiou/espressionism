import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vite-plus/test'

import { HeroHeader } from '@/components/HeroHeader'

function renderHero() {
  const rootRoute = createRootRoute({ component: HeroHeader })
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  return render(<RouterProvider router={router} />)
}

describe('HeroHeader', () => {
  it('points both calls to action at the calculator and the charts', async () => {
    renderHero()
    const start = await screen.findAllByRole('link', {
      name: 'Start calculating',
    })
    expect(start.length).toBeGreaterThan(0)
    for (const link of start) {
      expect(link.getAttribute('href')).toBe('/#calculator')
    }
    const charts = screen.getByRole('link', { name: 'See the charts' })
    expect(charts.getAttribute('href')).toBe('/#charts')
  })

  it('only shows from laptop width up', async () => {
    const { container } = renderHero()
    await screen.findByRole('heading', { level: 1 })
    const header = container.querySelector('header')
    expect(header?.className.split(' ')).toEqual(
      expect.arrayContaining(['hidden', 'lg:flex']),
    )
  })
})
