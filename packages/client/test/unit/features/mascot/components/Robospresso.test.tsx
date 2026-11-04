import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vite-plus/test'

import { Robospresso } from '@/features/mascot/components/Robospresso'

function part(container: HTMLElement, name: string) {
  return container.querySelector(`[data-part="${name}"]`)
}

describe('Robospresso', () => {
  it('names itself after its mood', () => {
    render(<Robospresso mood="searching" />)
    expect(
      screen.getByRole('img', { name: 'Robospresso, searching' }),
    ).toBeTruthy()
  })

  it('hides from screen readers when decorative', () => {
    const { container } = render(<Robospresso label="" />)
    expect(screen.queryByRole('img')).toBeNull()
    expect(container.querySelector('svg')?.getAttribute('aria-hidden')).toBe(
      'true',
    )
  })

  it('sweeps the glass and blinks the antenna while searching', () => {
    const { container } = render(<Robospresso mood="searching" animated />)
    expect(part(container, 'magnifier')?.getAttribute('class')).toContain(
      'animate-scan',
    )
    expect(part(container, 'antenna')?.getAttribute('class')).toContain(
      'animate-blink',
    )
  })

  it('keeps still when cool, with no glass in hand', () => {
    const { container } = render(<Robospresso mood="cool" animated />)
    expect(part(container, 'magnifier')).toBeNull()
    expect(part(container, 'antenna')?.getAttribute('class') ?? '').toBe('')
  })
})
