import { render } from '@testing-library/react'
import { describe, expect, it } from 'vite-plus/test'

import { Bitspresso } from '@/features/mascot/components/Bitspresso'

function steamGroups(container: HTMLElement) {
  return [...container.querySelectorAll('g[data-part="steam"]')]
}

describe('Bitspresso', () => {
  it('keeps the steam still unless asked to animate', () => {
    const { container } = render(<Bitspresso form="mug" mood="idle" />)
    const groups = steamGroups(container)
    expect(groups).toHaveLength(3)
    for (const g of groups) {
      expect(g.getAttribute('class') ?? '').not.toContain('animate-steam')
    }
  })

  it('staggers each steam wisp when animated', () => {
    const { container } = render(
      <Bitspresso form="mug" mood="happy" animated />,
    )
    const groups = steamGroups(container)
    expect(groups.map((g) => g.getAttribute('class'))).toEqual(
      Array(3).fill('animate-steam motion-reduce:animate-none'),
    )
    expect(groups.map((g) => (g as SVGGElement).style.animationDelay)).toEqual([
      '0s',
      '0.7s',
      '1.4s',
    ])
  })

  it('is hidden from screen readers when decorative', () => {
    const { container } = render(<Bitspresso label="" />)
    const svg = container.querySelector('svg')
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
    expect(svg?.getAttribute('role')).toBeNull()
  })
})
