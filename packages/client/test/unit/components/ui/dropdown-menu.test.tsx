import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vite-plus/test'

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// The trigger is a button, so it gets the pointer from the base layer in
// styles.css. Menu items are divs, so they carry it themselves.
describe('DropdownMenuRadioItem', () => {
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
