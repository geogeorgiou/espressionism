import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vite-plus/test'

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// The trigger is a button, so it gets the pointer from the base layer in
// styles.css. Options are divs, so they carry it themselves.
describe('SelectItem', () => {
  // An open select scrolls its chosen option into view; jsdom can't.
  beforeAll(() => {
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: () => {},
    })
  })

  it('gives every option the pointer', async () => {
    render(
      <Select defaultOpen defaultValue="latte">
        <SelectTrigger aria-label="Drink">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="latte">Latte</SelectItem>
          <SelectItem value="mocha">Mocha</SelectItem>
        </SelectContent>
      </Select>,
    )

    const options = await screen.findAllByRole('option')
    expect(options).toHaveLength(2)
    for (const option of options) {
      expect(option.className).toContain('cursor-pointer')
      expect(option.className).not.toContain('cursor-default')
    }
  })
})
