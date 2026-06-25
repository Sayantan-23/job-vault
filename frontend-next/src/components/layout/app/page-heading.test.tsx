import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PageHeading } from './page-heading'

describe('PageHeading', () => {
  it('renders the title as a heading and the description', () => {
    render(<PageHeading title="Jobs" description="24 tracked" />)
    expect(screen.getByRole('heading', { name: 'Jobs' })).toBeInTheDocument()
    expect(screen.getByText('24 tracked')).toBeInTheDocument()
  })

  it('renders actions when provided', () => {
    render(<PageHeading title="Jobs" actions={<button type="button">Add job</button>} />)
    expect(screen.getByRole('button', { name: 'Add job' })).toBeInTheDocument()
  })

  it('omits the description when none is given', () => {
    render(<PageHeading title="Personas" />)
    expect(screen.getByRole('heading', { name: 'Personas' })).toBeInTheDocument()
    expect(screen.queryByText('24 tracked')).not.toBeInTheDocument()
  })

  it('renders a quiet back link for nested pages', () => {
    render(
      <PageHeading
        title="Acme — cover letter"
        back={{ href: '/app/cover-letters', label: 'Cover letters' }}
      />,
    )
    const back = screen.getByRole('link', { name: /back to cover letters/i })
    expect(back).toHaveAttribute('href', '/app/cover-letters')
    expect(screen.getByRole('heading', { name: 'Acme — cover letter' })).toBeInTheDocument()
  })
})
