import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CoverLetterDiff } from './cover-letter-diff'

describe('CoverLetterDiff', () => {
  it('marks inserted and deleted words', () => {
    render(<CoverLetterDiff current="I has been here" proposed="I have been here" />)
    expect(screen.getByText('has')).toBeInTheDocument()
    expect(screen.getByText('have')).toBeInTheDocument()
  })

  it('diffs plain text — markdown markers and link syntax never appear literally', () => {
    const { container } = render(
      <CoverLetterDiff current="See **my** site" proposed="See **my** [portfolio](https://x.com)" />,
    )
    const text = container.textContent ?? ''
    expect(text).not.toContain('**')
    expect(text).not.toContain('](http')
    // The link renders as expanded "text (url)" plain form from coverLetterToPlainText.
    expect(text).toContain('portfolio (https://x.com)')
  })
})
