import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { JobSnapshot } from './job-snapshot'

describe('JobSnapshot', () => {
  it('renders markdown as HTML', () => {
    render(<JobSnapshot markdown={'# Role\n\nBuild things.'} sourceUrl={null} />)
    expect(screen.getByRole('heading', { name: 'Role' })).toBeInTheDocument()
    expect(screen.getByText('Build things.')).toBeInTheDocument()
  })

  it('shows an empty state when there is no snapshot', () => {
    render(<JobSnapshot markdown={null} sourceUrl={null} />)
    expect(screen.getByText(/no snapshot/i)).toBeInTheDocument()
  })

  it('links to the original posting when a sourceUrl is present', () => {
    render(<JobSnapshot markdown={'x'} sourceUrl="https://example.com/job" />)
    const link = screen.getByRole('link', { name: /view original/i })
    expect(link).toHaveAttribute('href', 'https://example.com/job')
  })
})
