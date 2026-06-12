import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// With `globals: false`, Testing Library cannot auto-register cleanup,
// so unmount rendered trees between tests to avoid DOM accumulation.
afterEach(() => {
  cleanup()
})

// jsdom implements neither window.matchMedia nor Element#scrollIntoView —
// stub both so components using useRevealBelowLg can run. Defaults to a
// non-matching query (desktop); tests can spy on window.matchMedia to
// simulate a small viewport.
if (typeof window !== 'undefined') {
  if (!window.matchMedia) {
    window.matchMedia = (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    })
  }
  if (!window.Element.prototype.scrollIntoView) {
    window.Element.prototype.scrollIntoView = () => {}
  }
}
