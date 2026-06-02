import { describe, it, expect, vi, afterEach } from 'vitest'
import { scrapeUrl } from './scraper.js'

function mockFetchHtml(html: string, ok = true): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok,
      status: ok ? 200 : 500,
      statusText: ok ? 'OK' : 'Server Error',
      text: () => Promise.resolve(html),
    }),
  )
}

afterEach(() => vi.unstubAllGlobals())

describe('scrapeUrl — JSON-LD JobPosting', () => {
  it('extracts title, company, location, and a markdown snapshot', async () => {
    const html = `<html><head><script type="application/ld+json">${JSON.stringify({
      '@type': 'JobPosting',
      title: 'Senior Engineer',
      hiringOrganization: { name: 'Acme Inc' },
      jobLocation: { address: { addressLocality: 'Berlin', addressCountry: 'DE' } },
      description: '<p>Build <strong>great</strong> things.</p>',
    })}</script></head><body><h1>ignored</h1></body></html>`
    mockFetchHtml(html)
    const r = await scrapeUrl('https://jobs.example.com/123')
    expect(r.title).toBe('Senior Engineer')
    expect(r.company).toBe('Acme Inc')
    expect(r.location).toContain('Berlin')
    expect(r.snapshotMarkdown).toContain('Build')
  })
})

describe('scrapeUrl — generic fallback', () => {
  it('uses <h1> and og:site_name when no JSON-LD is present', async () => {
    const html = `<html><head><meta property="og:site_name" content="Globex"/></head>
      <body><h1>Platform Engineer</h1><main><p>Own the platform.</p></main></body></html>`
    mockFetchHtml(html)
    const r = await scrapeUrl('https://careers.example.org/p')
    expect(r.title).toBe('Platform Engineer')
    expect(r.company).toBe('Globex')
    expect(r.snapshotMarkdown).toContain('Own the platform')
  })

  it('falls back to default labels when nothing is extractable', async () => {
    mockFetchHtml('<html><body><div>no useful markup</div></body></html>')
    const r = await scrapeUrl('https://example.com/x')
    expect(r.title).toBe('Untitled Position')
    expect(r.company).toBe('Unknown Company')
  })
})

describe('scrapeUrl — fallback seam', () => {
  it('invokes the fallback when Cheerio is missing title/company and merges its result', async () => {
    mockFetchHtml('<html><body><div>opaque SPA shell</div></body></html>')
    const fallback = vi.fn().mockResolvedValue({ title: 'AI Title', company: 'AI Co' })
    const r = await scrapeUrl('https://spa.example.com/job', fallback)
    expect(fallback).toHaveBeenCalledOnce()
    expect(r.title).toBe('AI Title')
    expect(r.company).toBe('AI Co')
  })

  it('ignores a throwing fallback and returns defaults', async () => {
    mockFetchHtml('<html><body><div>opaque</div></body></html>')
    const fallback = vi.fn().mockRejectedValue(new Error('boom'))
    const r = await scrapeUrl('https://spa.example.com/job', fallback)
    expect(r.title).toBe('Untitled Position')
  })

  it('does NOT invoke the fallback when Cheerio already has title + company', async () => {
    const html = `<html><body><h1>Found Title</h1><meta property="og:site_name" content="Found Co"/></body></html>`
    mockFetchHtml(html)
    const fallback = vi.fn()
    await scrapeUrl('https://example.com/ok', fallback)
    expect(fallback).not.toHaveBeenCalled()
  })
})

describe('scrapeUrl — fetch failure', () => {
  it('throws when the response is not ok', async () => {
    mockFetchHtml('', false)
    await expect(scrapeUrl('https://example.com/down')).rejects.toThrow(/Failed to fetch/)
  })
})
