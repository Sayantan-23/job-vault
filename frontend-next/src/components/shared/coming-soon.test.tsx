import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ComingSoon } from './coming-soon'

describe('ComingSoon', () => {
  it('shows the page title and a coming-soon note', () => {
    render(<ComingSoon title="About" />)
    expect(screen.getByRole('heading', { name: 'About' })).toBeInTheDocument()
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument()
  })
})
