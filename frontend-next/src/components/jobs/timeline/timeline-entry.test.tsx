import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TimelineEntry } from './timeline-entry'
import type { TimelineEvent } from '@/types/timeline'

function event(over: Partial<TimelineEvent> = {}): TimelineEvent {
  return {
    id: 't1',
    jobId: 'j1',
    userId: 'u1',
    type: 'AUTO',
    title: 'Job added to vault',
    description: 'Added to WISHLIST column',
    createdAt: new Date().toISOString(),
    ...over,
  }
}

describe('TimelineEntry', () => {
  it('renders an AUTO event with its title and description', () => {
    render(<TimelineEntry event={event()} />)
    expect(screen.getByText('Job added to vault')).toBeInTheDocument()
    expect(screen.getByText('Added to WISHLIST column')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-entry')).toHaveAttribute('data-type', 'AUTO')
  })

  it('renders a MANUAL event and omits a null description', () => {
    render(<TimelineEntry event={event({ type: 'MANUAL', title: 'Called recruiter', description: null })} />)
    expect(screen.getByText('Called recruiter')).toBeInTheDocument()
    expect(screen.getByTestId('timeline-entry')).toHaveAttribute('data-type', 'MANUAL')
    expect(screen.queryByText('Added to WISHLIST column')).not.toBeInTheDocument()
  })
})
