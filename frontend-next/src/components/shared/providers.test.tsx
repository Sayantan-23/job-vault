import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Providers } from './providers'

describe('Providers', () => {
  it('renders children inside the QueryClientProvider', () => {
    render(
      <Providers>
        <span data-testid="child">hi</span>
      </Providers>,
    )
    expect(screen.getByTestId('child')).toHaveTextContent('hi')
  })
})
