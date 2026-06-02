import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Logo } from './logo'

describe('Logo', () => {
  it('renders the JobVault wordmark', () => {
    render(<Logo />)
    expect(screen.getByText('JobVault')).toBeInTheDocument()
  })
})
