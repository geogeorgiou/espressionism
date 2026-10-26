import { createFileRoute, redirect } from '@tanstack/react-router'

// Catch-all: any path that doesn't match a page goes back to the calculator
// instead of showing a "Not Found" screen.
export const Route = createFileRoute('/$')({
  beforeLoad: () => {
    throw redirect({ to: '/', replace: true })
  },
})
