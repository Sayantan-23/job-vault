import { describe, it, expect } from 'vitest'
import { htmlToMarkdown } from './markdown.js'

describe('htmlToMarkdown', () => {
  it('returns empty string for empty input', () => {
    expect(htmlToMarkdown('')).toBe('')
  })
  it('converts headings and paragraphs (atx style)', () => {
    expect(htmlToMarkdown('<h1>Role</h1><p>Build things.</p>')).toBe('# Role\n\nBuild things.')
  })
  it('converts unordered lists with dash markers', () => {
    const md = htmlToMarkdown('<ul><li>One</li><li>Two</li></ul>')
    expect(md).toContain('- One')
    expect(md).toContain('- Two')
  })
  it('strips script/style/noscript content', () => {
    const md = htmlToMarkdown('<div><script>evil()</script><p>Safe</p><style>.x{}</style></div>')
    expect(md).toBe('Safe')
  })
  it('collapses 3+ blank lines to a single blank line', () => {
    const md = htmlToMarkdown('<p>a</p><br/><br/><br/><p>b</p>')
    expect(md).not.toMatch(/\n{3,}/)
  })
})
