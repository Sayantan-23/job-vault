import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StatusChip } from './status-chip'
import { JOB_STATUSES, STATUS_META } from '@/lib/job-status'

describe('StatusChip', () => {
  it('renders the human label for every status', () => {
    for (const status of JOB_STATUSES) {
      const { unmount } = render(<StatusChip status={status} />)
      expect(screen.getByText(STATUS_META[status].label)).toBeInTheDocument()
      unmount()
    }
  })

  it('applies each status its own surface classes', () => {
    for (const status of JOB_STATUSES) {
      const { unmount } = render(<StatusChip status={status} />)
      const chip = screen.getByTestId('status-chip')
      for (const cls of STATUS_META[status].className.split(' ')) {
        expect(chip.className).toContain(cls)
      }
      unmount()
    }
  })

  it('never reuses the GhostMeter health palette (semantic separation)', () => {
    for (const status of JOB_STATUSES) {
      const { unmount } = render(<StatusChip status={status} />)
      const chip = screen.getByTestId('status-chip')
      expect(chip.className).not.toContain('ghost-active')
      expect(chip.className).not.toContain('ghost-stale')
      expect(chip.className).not.toContain('ghost-ghosted')
      unmount()
    }
  })

  it('renders an uppercase mono chip for the terminal look', () => {
    render(<StatusChip status="WISHLIST" />)
    const chip = screen.getByTestId('status-chip')
    expect(chip.className).toContain('uppercase')
    expect(chip.className).toContain('font-mono')
  })
})
