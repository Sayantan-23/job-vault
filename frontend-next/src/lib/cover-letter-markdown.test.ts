import { describe, it, expect } from 'vitest'
import { parseCoverLetterMarkdown, type Block } from './cover-letter-markdown'

describe('parseCoverLetterMarkdown', () => {
  it('returns no blocks for empty/whitespace input', () => {
    expect(parseCoverLetterMarkdown('')).toEqual([])
    expect(parseCoverLetterMarkdown('   \n  \n')).toEqual([])
  })

  it('splits paragraphs on blank lines', () => {
    expect(parseCoverLetterMarkdown('First para.\n\nSecond para.')).toEqual<Block[]>([
      { lines: [[{ type: 'text', text: 'First para.' }]] },
      { lines: [[{ type: 'text', text: 'Second para.' }]] },
    ])
  })

  it('keeps single newlines inside a block as separate lines (soft breaks)', () => {
    expect(parseCoverLetterMarkdown('Jane Doe\nSan Francisco | jane@example.com')).toEqual<Block[]>([
      {
        lines: [
          [{ type: 'text', text: 'Jane Doe' }],
          [{ type: 'text', text: 'San Francisco | jane@example.com' }],
        ],
      },
    ])
  })

  it('normalizes CRLF and collapses 3+ blank lines into one boundary', () => {
    expect(parseCoverLetterMarkdown('A\r\n\r\n\r\n\r\nB')).toEqual<Block[]>([
      { lines: [[{ type: 'text', text: 'A' }]] },
      { lines: [[{ type: 'text', text: 'B' }]] },
    ])
  })

  it('parses bold runs', () => {
    expect(parseCoverLetterMarkdown('Dear **Hiring** Team,')).toEqual<Block[]>([
      {
        lines: [
          [
            { type: 'text', text: 'Dear ' },
            { type: 'bold', text: 'Hiring' },
            { type: 'text', text: ' Team,' },
          ],
        ],
      },
    ])
  })

  it('parses a single link', () => {
    expect(parseCoverLetterMarkdown('[LinkedIn](https://linkedin.com/in/janedoe)')).toEqual<Block[]>([
      { lines: [[{ type: 'link', text: 'LinkedIn', href: 'https://linkedin.com/in/janedoe' }]] },
    ])
  })

  it('parses multiple links and text on one line', () => {
    expect(
      parseCoverLetterMarkdown('[LinkedIn](https://linkedin.com/in/janedoe) | [GitHub](https://github.com/janedoe)'),
    ).toEqual<Block[]>([
      {
        lines: [
          [
            { type: 'link', text: 'LinkedIn', href: 'https://linkedin.com/in/janedoe' },
            { type: 'text', text: ' | ' },
            { type: 'link', text: 'GitHub', href: 'https://github.com/janedoe' },
          ],
        ],
      },
    ])
  })

  it('parses mixed text, bold, and link in a line', () => {
    expect(parseCoverLetterMarkdown('See **my** [site](https://x.com) now')).toEqual<Block[]>([
      {
        lines: [
          [
            { type: 'text', text: 'See ' },
            { type: 'bold', text: 'my' },
            { type: 'text', text: ' ' },
            { type: 'link', text: 'site', href: 'https://x.com' },
            { type: 'text', text: ' now' },
          ],
        ],
      },
    ])
  })

  it('strips leading heading markers but keeps the text', () => {
    expect(parseCoverLetterMarkdown('## Cover Letter')).toEqual<Block[]>([
      { lines: [[{ type: 'text', text: 'Cover Letter' }]] },
    ])
  })

  it('handles a realistic letter with header, salutation, and paragraphs', () => {
    const md = [
      'Jane Doe',
      'San Francisco, CA | jane.doe@example.com',
      '[LinkedIn](https://linkedin.com/in/janedoe) | [GitHub](https://github.com/janedoe)',
      '',
      'Dear **Hiring** Team,',
      '',
      'I am writing to express my strong interest.',
    ].join('\n')
    expect(parseCoverLetterMarkdown(md)).toEqual<Block[]>([
      {
        lines: [
          [{ type: 'text', text: 'Jane Doe' }],
          [{ type: 'text', text: 'San Francisco, CA | jane.doe@example.com' }],
          [
            { type: 'link', text: 'LinkedIn', href: 'https://linkedin.com/in/janedoe' },
            { type: 'text', text: ' | ' },
            { type: 'link', text: 'GitHub', href: 'https://github.com/janedoe' },
          ],
        ],
      },
      {
        lines: [
          [
            { type: 'text', text: 'Dear ' },
            { type: 'bold', text: 'Hiring' },
            { type: 'text', text: ' Team,' },
          ],
        ],
      },
      { lines: [[{ type: 'text', text: 'I am writing to express my strong interest.' }]] },
    ])
  })
})
