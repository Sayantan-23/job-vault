import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GhostMeter } from './ghost-meter'

describe('GhostMeter', () => {
  it('renders the day count in a mono numeric', () => {
    render(<GhostMeter days={5} />)
    expect(screen.getByText('5d')).toBeInTheDocument()
  })

  it('applies the active color for fresh applications', () => {
    render(<GhostMeter days={3} />)
    expect(screen.getByTestId('ghost-meter').className).toContain('text-ghost-active')
  })

  it('applies the stale color in the warning range', () => {
    render(<GhostMeter days={10} />)
    expect(screen.getByTestId('ghost-meter').className).toContain('text-ghost-stale')
  })

  it('applies the ghosted color past the stale threshold', () => {
    render(<GhostMeter days={30} />)
    expect(screen.getByTestId('ghost-meter').className).toContain('text-ghost-ghosted')
  })

  it('exposes an accessible activity label', () => {
    render(<GhostMeter days={1} />)
    expect(screen.getByLabelText('Last activity: 1 day ago')).toBeInTheDocument()
  })
})
