import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

// With `globals: false`, Testing Library cannot auto-register cleanup,
// so unmount rendered trees between tests to avoid DOM accumulation.
afterEach(() => {
  cleanup()
})
