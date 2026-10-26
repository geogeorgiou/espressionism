import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

export type PageSection = 'calculator' | 'charts'

interface SectionLinkProps {
  section: PageSection
  className?: string
  children: ReactNode
}

/**
 * Jumps to a section of the page through the router, so the calculator's
 * search params stay in the URL and the router doesn't reset the scroll.
 */
export function SectionLink({
  section,
  className,
  children,
}: SectionLinkProps) {
  return (
    <Link
      to="/"
      search={(prev) => prev}
      hash={section}
      hashScrollIntoView={{ behavior: 'smooth', block: 'start' }}
      resetScroll={false}
      className={className}
    >
      {children}
    </Link>
  )
}
