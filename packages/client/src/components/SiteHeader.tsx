import { Link } from '@tanstack/react-router'

import { HeroHeader } from '@/components/HeroHeader'
import { Bitspresso } from '@/features/mascot/components/Bitspresso'
import { ThemeSwitcher } from '@/features/theme/components/ThemeSwitcher'

/**
 * Compact header on phones and tablets; the full landing hero from `lg` up.
 */
export function SiteHeader() {
  return (
    <>
      <HeroHeader />
      <header className="border-b-4 border-foreground bg-card lg:hidden">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-4 py-5 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <Link
              to="/"
              className="flex w-fit items-center gap-3 text-foreground no-underline"
            >
              <span className="rounded-md bg-screen p-1">
                <Bitspresso
                  form="mug"
                  mood="wink"
                  className="size-9"
                  label=""
                />
              </span>
              <span className="font-pixel text-xl">Espressionism</span>
            </Link>
            <ThemeSwitcher />
          </div>
          <div className="flex max-w-2xl flex-col gap-2">
            <h1 className="font-pixel text-2xl leading-tight text-balance sm:text-4xl">
              Café every day, or a machine at home?
            </h1>
            <p className="text-base text-muted-foreground sm:text-lg">
              Put in what you spend now and what a machine would cost. See when
              it pays for itself and what a home cup really costs.
            </p>
          </div>
        </div>
      </header>
    </>
  )
}
