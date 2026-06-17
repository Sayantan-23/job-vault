import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MarkdownProse } from './markdown-prose'

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

  it('drops images (decoys, logos, tracking pixels) entirely', () => {
    const { container } = render(
      <MarkdownProse>{'![](data:image/svg+xml;base64,AAAA)\n\nReal description text.'}</MarkdownProse>,
    )
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('Real description text.')).toBeInTheDocument()
  })
})
