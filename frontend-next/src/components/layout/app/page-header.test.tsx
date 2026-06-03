import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageHeader } from './page-header'

describe('PageHeader', () => {
  it('renders the title as a heading and the description', () => {
    render(<PageHeader title="Jobs" description="2 tracked" />)
    expect(screen.getByRole('heading', { name: 'Jobs' })).toBeInTheDocument()
    expect(screen.getByText('2 tracked')).toBeInTheDocument()
  })

  it('renders right-aligned actions when provided', () => {
    render(<PageHeader title="Jobs" actions={<button type="button">Add job</button>} />)
    expect(screen.getByRole('button', { name: 'Add job' })).toBeInTheDocument()
  })

  it('omits the description line when none is given', () => {
    render(<PageHeader title="Dashboard" />)
    expect(screen.getByRole('heading', { name: 'Dashboard' })).toBeInTheDocument()
    // No stray paragraph under the title.
    expect(screen.queryByText('2 tracked')).not.toBeInTheDocument()
  })
})
