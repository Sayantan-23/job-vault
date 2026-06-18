import { describe, it, expect, vi, afterEach } from 'vitest'

// safeFetch wraps the SSRF guard + redirect handling + streaming read; mock it to
// serve canned HTML so these unit tests stay hermetic (safe-fetch + url-guard are
// exercised in their own test files).
const { safeFetch } = vi.hoisted(() => ({ safeFetch: vi.fn() }))
vi.mock('./safe-fetch.js', () => ({
  safeFetch,
  // The mock serves real Response objects, so the cap-reader is just .text().
  readTextCapped: (res: Response) => res.text(),
}))

import { scrapeUrl, isShellResult, looksLikeInterstitial } from './scraper.js'

function mockFetchHtml(html: string, ok = true): void {
  // A real Response so scraper's streaming read (response.body.getReader) works.
  safeFetch.mockResolvedValue(new Response(ok ? html : '', { status: ok ? 200 : 500 }))
}

afterEach(() => {
  vi.unstubAllGlobals()
  safeFetch.mockReset()
})

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

describe('scrapeUrl — status + source', () => {
  it("marks a fully-extracted result 'ok'/'static'", async () => {
    const html = `<html><head><meta property="og:site_name" content="Globex"/></head>
      <body><h1>Platform Engineer</h1><main><p>Own the platform end to end.</p></main></body></html>`
    mockFetchHtml(html)
    const r = await scrapeUrl('https://careers.example.org/p')
    expect(r.status).toBe('ok')
    expect(r.source).toBe('static')
  })

  it("marks a nothing-extracted result 'empty'", async () => {
    mockFetchHtml('<html><body><div>no useful markup at all</div></body></html>')
    const r = await scrapeUrl('https://example.com/x')
    expect(r.status).toBe('empty')
  })

  it('strips decoy images from the snapshot and reports the render source', async () => {
    // A shell page: no title/company, body is only an anti-scrape decoy image.
    mockFetchHtml('<html><body><img src="data:image/svg+xml;base64,PD94bWw="/></body></html>')
    const fallback = vi.fn().mockResolvedValue({
      title: 'Quality Analyst',
      company: 'Teleperformance',
      snapshotMarkdown: '# Quality Analyst\n\nResponsibilities include QA.',
      source: 'render' as const,
    })
    const r = await scrapeUrl('https://www.naukri.com/job-listings-x', fallback)
    expect(r.title).toBe('Quality Analyst')
    expect(r.company).toBe('Teleperformance')
    expect(r.snapshotMarkdown).not.toMatch(/data:|!\[/)
    expect(r.source).toBe('render')
    expect(r.status).toBe('ok')
  })
})

describe('scrapeUrl — fallback returning null', () => {
  it('falls through to the (default) static result when the fallback returns null', async () => {
    mockFetchHtml('<html><body><div>opaque shell</div></body></html>')
    const fallback = vi.fn().mockResolvedValue(null)
    const r = await scrapeUrl('https://spa.example.com/job', fallback)
    expect(fallback).toHaveBeenCalledOnce()
    expect(r.title).toBe('Untitled Position')
    expect(r.status).toBe('empty')
  })
})

describe('scrapeUrl — company from page title', () => {
  it('parses "… at {Company}" from <title> when no other company is found', async () => {
    const html = `<html><head><title>Job Application for Delivery Consultant at Airtable</title></head>
      <body><h1>Delivery Consultant</h1><main><p>Help customers deliver.</p></main></body></html>`
    mockFetchHtml(html)
    const r = await scrapeUrl('https://boards.greenhouse.io/airtable/jobs/123')
    expect(r.title).toBe('Delivery Consultant')
    expect(r.company).toBe('Airtable')
  })

  it('does NOT treat a generic "… at <lowercase phrase>" tail as a company', async () => {
    const html = `<html><head><title>Build systems that operate at scale</title></head>
      <body><h1>Staff Engineer</h1><main><p>Own the platform.</p></main></body></html>`
    mockFetchHtml(html)
    const r = await scrapeUrl('https://careers.example.com/role')
    expect(r.title).toBe('Staff Engineer')
    expect(r.company).toBe('Unknown Company') // 'scale' rejected by the proper-noun guard
  })
})

describe('isShellResult', () => {
  it('is true for missing/placeholder title or company, or an image-only snapshot', () => {
    expect(isShellResult({})).toBe(true)
    expect(isShellResult({ title: 'Untitled Position', company: 'Acme', snapshotMarkdown: 'words here' })).toBe(true)
    expect(isShellResult({ title: 'Engineer', company: 'Unknown Company', snapshotMarkdown: 'words here' })).toBe(true)
    expect(isShellResult({ title: 'Engineer', company: 'Acme', snapshotMarkdown: '![](data:image/png;base64,AAAA)' })).toBe(true)
  })
  it('is false when title, company, and a real snapshot are all present', () => {
    expect(isShellResult({ title: 'Engineer', company: 'Acme', snapshotMarkdown: 'Build things here.' })).toBe(false)
  })
})

describe('scrapeUrl — bot-protected static fetch (403)', () => {
  it('falls through to the render fallback when the static fetch throws', async () => {
    safeFetch.mockRejectedValue(new Error('Failed to fetch URL: 403 Forbidden'))
    const fallback = vi
      .fn()
      .mockResolvedValue({ title: 'Recovered', company: 'Acme', snapshotMarkdown: 'Real JD here.', source: 'render' })
    const r = await scrapeUrl('https://www.indeed.com/viewjob?jk=x', fallback)
    expect(fallback).toHaveBeenCalledOnce()
    expect(r.title).toBe('Recovered')
    expect(r.source).toBe('render')
  })

  it('returns an empty result (not an error) when the static fetch fails and the fallback recovers nothing', async () => {
    safeFetch.mockRejectedValue(new Error('Failed to fetch URL: 403 Forbidden'))
    const r = await scrapeUrl('https://www.indeed.com/viewjob?jk=x', vi.fn().mockResolvedValue(null))
    expect(r.status).toBe('empty')
  })
})

describe('scrapeUrl — bot interstitials', () => {
  it('treats a Cloudflare "Just a moment…" page as empty and never persists it', async () => {
    mockFetchHtml(
      '<html><head><title>Just a moment...</title></head><body><h1>Just a moment...</h1><p>Checking your browser before accessing the site.</p></body></html>',
    )
    const r = await scrapeUrl('https://www.indeed.com/viewjob?jk=x')
    expect(r.status).toBe('empty')
    expect(r.title).toBe('Untitled Position')
    expect(r.snapshotMarkdown).toBe('')
  })
})

describe('looksLikeInterstitial', () => {
  it('matches known bot-wall phrases and ignores real content', () => {
    expect(looksLikeInterstitial('Just a moment...', undefined)).toBe(true)
    expect(looksLikeInterstitial(undefined, 'Please verify you are human to continue')).toBe(true)
    expect(looksLikeInterstitial('Senior Engineer', 'Own the platform end to end.')).toBe(false)
  })
})

describe('scrapeUrl — fetch failure (no fallback)', () => {
  it('throws when the response is not ok and there is no fallback', async () => {
    mockFetchHtml('', false)
    await expect(scrapeUrl('https://example.com/down')).rejects.toThrow(/Failed to fetch/)
  })
})
