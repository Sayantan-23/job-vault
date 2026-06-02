import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatCard } from './stat-card'

describe('StatCard', () => {
  it('renders the label and value', () => {
    render(<StatCard label="Total" value={42} />)
    expect(screen.getByText('Total')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('applies the ghost accent to the value when accent is set', () => {
    render(<StatCard label="Ghost alerts" value={3} accent />)
    expect(screen.getByText('3')).toHaveClass('text-ghost-ghosted')
  })

  it('does not apply the accent by default', () => {
    render(<StatCard label="Total" value={5} />)
    expect(screen.getByText('5')).not.toHaveClass('text-ghost-ghosted')
  })
})
