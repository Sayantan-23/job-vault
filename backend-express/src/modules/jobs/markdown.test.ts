import { describe, it, expect } from 'vitest'
import { htmlToMarkdown, sanitizeSnapshotMarkdown } from './markdown.js'

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
  it('strips images (incl. data: decoys) from converted HTML', () => {
    const md = htmlToMarkdown(
      '<p>Real text.</p><img src="data:image/svg+xml;base64,PD94bWw="/><img src="https://x/transparentImg.png"/>',
    )
    expect(md).toBe('Real text.')
    expect(md).not.toMatch(/!\[|data:|transparentImg/)
  })
})

describe('sanitizeSnapshotMarkdown', () => {
  it('returns empty string for empty input', () => {
    expect(sanitizeSnapshotMarkdown('')).toBe('')
  })
  it('removes the Naukri-style data: SVG decoy and transparent pixel', () => {
    const md = sanitizeSnapshotMarkdown(
      '# Quality Analyst\n![](<data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIj8+>)![](https://static.naukimg.com/s/0/0/i/transparentImg.png)\n\nResponsibilities…',
    )
    expect(md).toContain('# Quality Analyst')
    expect(md).toContain('Responsibilities')
    expect(md).not.toMatch(/data:|transparentImg|!\[/)
  })
  it('drops linked logo images but keeps real links and text', () => {
    const md = sanitizeSnapshotMarkdown(
      '[![Logo](https://x/logo.svg)](https://acme.example)\n\nWork at [Acme](https://acme.example) building things.',
    )
    expect(md).not.toMatch(/!\[|logo\.svg/)
    expect(md).toContain('[Acme](https://acme.example)')
    expect(md).toContain('building things')
  })
  it('keeps the visible text of a data: link, dropping the href', () => {
    expect(sanitizeSnapshotMarkdown('See [the brochure](data:text/html;base64,AAAA) now')).toBe(
      'See the brochure now',
    )
  })
  it('is idempotent', () => {
    const once = sanitizeSnapshotMarkdown('![](https://x/a.png)\n\nHello')
    expect(sanitizeSnapshotMarkdown(once)).toBe(once)
  })
  it('handles image URLs containing parentheses without mangling surrounding prose', () => {
    const md = sanitizeSnapshotMarkdown('We use ![chart](https://x/Foo_(bar).png) for onboarding.')
    expect(md).not.toMatch(/!\[|Foo_\(bar\)|\.png/)
    expect(md).toContain('We use')
    expect(md).toContain('for onboarding.')
  })
  it('removes a linked image whose href has parentheses, keeping later text', () => {
    const md = sanitizeSnapshotMarkdown('[![Logo](https://x/l.png)](https://acme.example/path_(x)) Apply now.')
    expect(md).not.toMatch(/!\[|l\.png/)
    expect(md).toContain('Apply now.')
  })
  it('keeps a normal markdown link with a parenthesized URL untouched', () => {
    const md = sanitizeSnapshotMarkdown('See [the wiki](https://x/Page_(v2)) for details.')
    expect(md).toBe('See [the wiki](https://x/Page_(v2)) for details.')
  })
})
