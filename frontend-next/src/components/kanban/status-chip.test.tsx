import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusChip } from './status-chip'

describe('StatusChip', () => {
  it('renders the human label for a status', () => {
    render(<StatusChip status="INTERVIEWING" />)
    expect(screen.getByText('Interviewing')).toBeInTheDocument()
  })

  it('renders an uppercase mono code for the terminal look', () => {
    render(<StatusChip status="WISHLIST" />)
    expect(screen.getByTestId('status-chip').className).toContain('uppercase')
  })
})
