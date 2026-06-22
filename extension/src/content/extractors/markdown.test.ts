import { describe, it, expect } from 'vitest'
import { htmlToMarkdown, sanitizeSnapshotMarkdown, descriptionToMarkdown } from './markdown'

describe('htmlToMarkdown', () => {
  it('converts headings, bold, and lists to Markdown', () => {
    const md = htmlToMarkdown('<h2>Summary</h2><p>Hello <strong>world</strong></p><ul><li>A</li><li>B</li></ul>')
    expect(md).toContain('## Summary')
    expect(md).toContain('**world**')
    expect(md).toContain('- A')
    expect(md).toContain('- B')
    expect(md).not.toContain('<li>')
    expect(md).not.toContain('<strong>')
  })

  it('strips images, raw <img>, and data: decoys', () => {
    expect(htmlToMarkdown('<p>Hi</p><img src="data:image/gif;base64,xxx">')).toBe('Hi')
    expect(sanitizeSnapshotMarkdown('![](data:image/png;base64,AAA)')).toBe('')
  })

  it('strips decorative bold when most of the description is bold (Naukri)', () => {
    const html =
      '<p><strong>Position: Engineer</strong></p><p><strong>Location: Pune</strong></p><p><strong>Experience: 3 years</strong></p>'
    const md = htmlToMarkdown(html)
    expect(md).not.toContain('**')
    expect(md).toContain('Position: Engineer')
  })

  it('keeps sparse, meaningful bold (e.g. a single heading)', () => {
    const html =
      '<p><strong>Responsibilities:</strong></p><p>Build and test a large amount of software across many teams and projects over a long time.</p>'
    expect(htmlToMarkdown(html)).toContain('**Responsibilities:**')
  })

  it('returns empty/undefined for empty input', () => {
    expect(htmlToMarkdown('')).toBe('')
    expect(descriptionToMarkdown(undefined)).toBeUndefined()
    expect(descriptionToMarkdown('')).toBeUndefined()
  })
})
