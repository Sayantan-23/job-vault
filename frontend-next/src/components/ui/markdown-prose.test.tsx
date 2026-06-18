import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MarkdownProse, repairSplitBold } from './markdown-prose'

describe('MarkdownProse', () => {
  it('renders headings, paragraphs, and bullet lists with explicit spacing classes', () => {
    render(<MarkdownProse>{'# Role\n\nBuild things.\n\n- one\n- two'}</MarkdownProse>)
    expect(screen.getByRole('heading', { name: 'Role' })).toBeInTheDocument()
    expect(screen.getByText('Build things.')).toBeInTheDocument()
    const list = screen.getByRole('list')
    expect(list.className).toContain('list-disc')
    expect(screen.getAllByRole('listitem')).toHaveLength(2)
  })

  it('renders links with our token styling and opens in a new tab', () => {
    render(<MarkdownProse>{'See [the site](https://example.com).'}</MarkdownProse>)
    const link = screen.getByRole('link', { name: 'the site' })
    expect(link).toHaveAttribute('href', 'https://example.com')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.className).toContain('text-primary')
  })

  it('renders bold whose markers were split across a blank line', () => {
    render(<MarkdownProse>{'**Responsibilities\n\n**\n\n- one'}</MarkdownProse>)
    const strong = screen.getByText('Responsibilities')
    expect(strong.tagName).toBe('STRONG')
    // The literal asterisks must not leak into the output.
    expect(screen.queryByText(/\*\*/)).toBeNull()
  })

  it('drops images (decoys, logos, tracking pixels) entirely', () => {
    const { container } = render(
      <MarkdownProse>{'![](data:image/svg+xml;base64,AAAA)\n\nReal description text.'}</MarkdownProse>,
    )
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('Real description text.')).toBeInTheDocument()
  })
})

describe('repairSplitBold', () => {
  it('joins a closing ** that was pushed onto a later line', () => {
    expect(repairSplitBold('**Responsibilities\n\n**')).toBe('**Responsibilities**')
    expect(repairSplitBold('**When You Need To Apply\n**')).toBe('**When You Need To Apply**')
  })
  it('leaves well-formed inline bold and unrelated asterisks untouched', () => {
    expect(repairSplitBold('**Bold** and normal text')).toBe('**Bold** and normal text')
    expect(repairSplitBold('**A**\n\n**B**')).toBe('**A**\n\n**B**')
    expect(repairSplitBold('a * b * c')).toBe('a * b * c')
  })
})
