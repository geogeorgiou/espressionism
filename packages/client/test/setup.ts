import * as streamWeb from 'node:stream/web'

import { cleanup } from '@testing-library/react'
import { afterEach } from 'vite-plus/test'

afterEach(() => {
  cleanup()
})

// jsdom has no matchMedia: default to a light, no-preference environment.
// Tests that care stub it themselves (see features/theme/match-media.ts).
if (typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

// The VM context jsdom runs in lacks some of Node's web streams, which the
// AI SDK's chat uses to read Robospresso's answers. Borrow Node's.
for (const [name, value] of Object.entries(streamWeb)) {
  if (!(name in globalThis)) {
    Object.defineProperty(globalThis, name, {
      writable: true,
      configurable: true,
      value,
    })
  }
}
