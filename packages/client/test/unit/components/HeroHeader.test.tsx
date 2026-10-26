import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRouter,
} from '@tanstack/react-router'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
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

  it("speaks the active theme's sticker line", async () => {
    window.localStorage.setItem('espressionism-theme', 'mint')
    renderHero()
    expect(await screen.findByText('Is that decaf?!')).toBeTruthy()
    window.localStorage.clear()
  })

  it('scares Bitspresso while the card is hovered', async () => {
    const user = userEvent.setup()
    renderHero()
    const mascot = await screen.findByRole('img', { name: /house mug, happy/ })
    const card = mascot.parentElement as HTMLElement

    await user.hover(card)
    expect(screen.getByText("Don't drink me plz!")).toBeTruthy()
    expect(screen.getByRole('img', { name: /house mug, scared/ })).toBeTruthy()
    expect(card.className.split(' ')).toContain('animate-shiver')

    await user.unhover(card)
    expect(screen.queryByText("Don't drink me plz!")).toBeNull()
    expect(screen.getByRole('img', { name: /house mug, happy/ })).toBeTruthy()
    expect(card.className.split(' ')).not.toContain('animate-shiver')
  })
})
