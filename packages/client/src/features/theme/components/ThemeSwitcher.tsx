import { clsx } from 'clsx'
import { PaletteIcon } from 'lucide-react'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

import { useTheme } from '../hooks/use-theme'
import type { ThemeOption } from '../utils/themes'
import { THEMES, isThemeId } from '../utils/themes'

function Swatch({ colors }: { colors: ThemeOption['swatch'] }) {
  return (
    <span
      aria-hidden
      className="flex size-6 shrink-0 overflow-hidden rounded-[3px] border-2 border-foreground"
    >
      {colors.map((color) => (
        <span
          key={color}
          className="h-full flex-1"
          style={{ backgroundColor: color }}
        />
      ))}
    </span>
  )
}

interface ThemeSwitcherProps {
  /** Show the theme name next to the icon (wide layouts). */
  showLabel?: boolean
  className?: string
}

export function ThemeSwitcher({
  showLabel = false,
  className,
}: ThemeSwitcherProps) {
  const { theme, setTheme } = useTheme()
  const active = THEMES.find((t) => t.id === theme) ?? THEMES[0]

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size={showLabel ? 'default' : 'icon'}
          aria-label={`Color theme: ${active.label}`}
          className={clsx('shrink-0', className)}
        >
          <PaletteIcon aria-hidden />
          {showLabel && <span>{active.label}</span>}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="font-pixel text-xs tracking-wide text-brew uppercase">
          Color theme
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup
          value={theme}
          onValueChange={(value) => {
            if (isThemeId(value)) setTheme(value)
          }}
        >
          {THEMES.map((option) => (
            <DropdownMenuRadioItem
              key={option.id}
              value={option.id}
              className="min-h-11 gap-3"
            >
              <Swatch colors={option.swatch} />
              <span className="flex flex-col">
                <span className="font-semibold">{option.label}</span>
                <span className="text-xs text-muted-foreground">
                  {option.description}
                </span>
              </span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
