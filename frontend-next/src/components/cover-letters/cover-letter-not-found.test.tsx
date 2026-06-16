import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CoverLetterNotFound } from './cover-letter-not-found'

describe('CoverLetterNotFound', () => {
  it('renders a themed message with a link back to the cover-letters index', () => {
    render(<CoverLetterNotFound />)
    expect(screen.getByRole('heading', { name: /cover letter not found/i })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /back to cover letters/i })).toHaveAttribute('href', '/app/cover-letters')
  })
})
