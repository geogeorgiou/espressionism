import { render, screen } from '@testing-library/react'
import { beforeAll, describe, expect, it } from 'vite-plus/test'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

// Buttons (and so every trigger) get the pointer from the base layer in
// styles.css. Options and menu items are divs, so they carry it themselves.
describe('pointer cursor on dropdown options', () => {
  // An open select scrolls its chosen option into view; jsdom can't.
  beforeAll(() => {
    Object.defineProperty(Element.prototype, 'scrollIntoView', {
      configurable: true,
      value: () => {},
    })
  })

  it('gives every select option the pointer', async () => {
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

  it('gives every menu item the pointer', async () => {
    render(
      <DropdownMenu defaultOpen>
        <DropdownMenuTrigger>Color theme</DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuRadioGroup value="diner">
            <DropdownMenuRadioItem value="diner">Diner</DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="night">Night</DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuContent>
      </DropdownMenu>,
    )

    const items = await screen.findAllByRole('menuitemradio')
    expect(items).toHaveLength(2)
    for (const item of items) {
      expect(item.className).toContain('cursor-pointer')
      expect(item.className).not.toContain('cursor-default')
    }
  })
})
