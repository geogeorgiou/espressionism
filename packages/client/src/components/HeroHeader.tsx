import { Link } from '@tanstack/react-router'
import { clsx } from 'clsx'
import { useState } from 'react'

import { SectionLink } from '@/components/SectionLink'
import { Button } from '@/components/ui/button'
import { Bitspresso } from '@/features/mascot/components/Bitspresso'
import { ThemeSwitcher } from '@/features/theme/components/ThemeSwitcher'
import { useTheme } from '@/features/theme/hooks/use-theme'
import { stickerLine } from '@/features/theme/utils/themes'

const NAV_LINKS = [
  { section: 'calculator', label: 'Calculator' },
  { section: 'charts', label: 'Charts' },
] as const

const HIGHLIGHTS = [
  { title: 'Break-even', text: 'The month the machine has paid for itself' },
  { title: 'Yearly spend', text: 'Café and home, side by side' },
  { title: 'Per cup', text: 'The real price, machine included' },
] as const

/**
 * Landing hero for laptop screens and up (`lg`). Smaller screens keep the
 * compact header in SiteHeader, so the calculator stays one scroll away.
 */
export function HeroHeader() {
  // The speech bubble says the active theme's sticker line.
  const { palette } = useTheme()
  // Hovering the card scares Bitspresso: wide eyes, sweat, a shiver, "Eek!".
  const [scared, setScared] = useState(false)

  return (
    <header className="hidden flex-col lg:flex lg:min-h-[calc(100dvh-4rem)]">
      <div className="border-b-4 border-foreground bg-card">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 py-4">
          <Link
            to="/"
            className="flex items-center gap-3 text-foreground no-underline"
          >
            <span className="rounded-md bg-screen p-1">
              <Bitspresso form="mug" mood="wink" className="size-9" label="" />
            </span>
            <span className="font-pixel text-xl">Espressionism</span>
          </Link>
          <nav aria-label="Main" className="flex items-center gap-2">
            {NAV_LINKS.map((link) => (
              <SectionLink
                key={link.section}
                section={link.section}
                className="px-3.5 py-3 font-semibold text-foreground no-underline hover:text-primary"
              >
                {link.label}
              </SectionLink>
            ))}
            <Button asChild className="border-2 border-foreground font-pixel">
              <SectionLink section="calculator">Start calculating</SectionLink>
            </Button>
            <ThemeSwitcher showLabel className="ml-2" />
          </nav>
        </div>
      </div>

      <div className="flex flex-1 items-center">
        <div className="mx-auto flex w-full max-w-6xl items-center gap-14 px-6 py-16">
          <div className="flex min-w-0 flex-[999_1_460px] flex-col gap-6">
            <p className="font-pixel text-sm tracking-wide text-brew uppercase">
              Espresso machine break-even calculator
            </p>
            <h1 className="font-pixel text-6xl leading-[1.05] text-balance xl:text-7xl">
              Café every day, or a machine at home?
            </h1>
            <p className="max-w-[46ch] text-xl text-muted-foreground">
              Put in what you spend now and what a machine would cost. See when
              it pays for itself and what a home cup really costs.
            </p>
            <div className="flex flex-wrap gap-4">
              <SectionLink
                section="calculator"
                className="bg-foreground px-6 py-4 font-pixel text-background no-underline shadow-pixel hover:translate-x-px hover:translate-y-px"
              >
                Start calculating
              </SectionLink>
              <SectionLink
                section="charts"
                className="border-[3px] border-foreground bg-card px-6 py-3.5 font-pixel text-foreground no-underline hover:bg-accent"
              >
                See the charts
              </SectionLink>
            </div>
          </div>

          <figure className="flex flex-[1_1_340px] justify-center">
            <div
              onPointerEnter={() => setScared(true)}
              onPointerLeave={() => setScared(false)}
              className={clsx(
                'flex flex-col items-center gap-3 border-[6px] border-foreground bg-screen p-6 text-screen-foreground shadow-pixel-lg',
                scared && 'animate-shiver motion-reduce:animate-none',
              )}
            >
              <p className="self-end bg-screen-foreground px-2.5 py-1.5 font-pixel text-sm text-screen">
                {scared ? 'Eek!' : stickerLine(palette)}
              </p>
              <Bitspresso
                form="mug"
                mood={scared ? 'scared' : 'happy'}
                flavor="house"
                animated
                className="size-72 xl:size-80"
              />
              <figcaption className="font-pixel text-2xl">
                Bitspresso
              </figcaption>
            </div>
          </figure>
        </div>
      </div>

      <div className="bg-screen text-screen-foreground">
        <ul className="mx-auto grid w-full max-w-6xl grid-cols-3 gap-8 px-6 py-5">
          {HIGHLIGHTS.map((item) => (
            <li key={item.title} className="flex flex-col gap-1">
              <span className="font-pixel text-crema">{item.title}</span>
              <span>{item.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </header>
  )
}
