import { describe, it, expect } from 'vitest'
import { extractFromDocument } from './extract'

function docFrom(html: string): Document {
  return new DOMParser().parseFromString(html, 'text/html')
}

describe('extractFromDocument', () => {
  it('extracts the FOCUSED job from a LinkedIn split-pane layout', () => {
    const html = `
      <ul class="jobs-search-results-list">
        <li><a class="job-card-list__title">A Different Job</a></li>
      </ul>
      <div class="jobs-search__job-details">
        <h1 class="job-details-jobs-unified-top-card__job-title">Senior Backend Engineer</h1>
        <a class="job-details-jobs-unified-top-card__company-name">Acme Corp</a>
        <div class="job-details-jobs-unified-top-card__primary-description-container">Berlin, Germany</div>
        <div class="jobs-description__content">We are hiring a backend engineer.</div>
      </div>`
    const out = extractFromDocument(
      docFrom(html),
      'https://www.linkedin.com/jobs/search?currentJobId=4012345678',
    )
    expect(out).toMatchObject({
      title: 'Senior Backend Engineer',
      company: 'Acme Corp',
      location: 'Berlin, Germany',
      platform: 'linkedin',
      confidence: 'ok',
      sourceUrl: 'https://www.linkedin.com/jobs/view/4012345678',
    })
    expect(out.description).toContain('backend engineer')
  })

  it('extracts an Indeed job via data-testid', () => {
    const html = `
      <h1 data-testid="jobsearch-JobInfoHeader-title">Data Scientist</h1>
      <div data-testid="inlineHeader-companyName">Globex</div>
      <div data-testid="inlineHeader-companyLocation">Remote</div>
      <div id="jobDescriptionText">Build models.</div>`
    const out = extractFromDocument(docFrom(html), 'https://www.indeed.com/viewjob?jk=abc')
    expect(out).toMatchObject({
      title: 'Data Scientist',
      company: 'Globex',
      location: 'Remote',
      platform: 'indeed',
      confidence: 'ok',
    })
  })

  it('extracts a generic board from schema.org JobPosting JSON-LD', () => {
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: 'Platform Engineer',
      hiringOrganization: { '@type': 'Organization', name: 'Initech' },
      jobLocation: { '@type': 'Place', address: { addressLocality: 'Austin' } },
      description: 'Run the platform.',
    }
    const html = `<script type="application/ld+json">${JSON.stringify(ld)}</script><h1>Ignored Header</h1>`
    const out = extractFromDocument(docFrom(html), 'https://boards.greenhouse.io/initech/jobs/1')
    expect(out).toMatchObject({
      title: 'Platform Engineer',
      company: 'Initech',
      location: 'Austin',
      platform: 'generic',
      confidence: 'ok',
    })
  })

  it('reads location from an array jobLocation and a string hiringOrganization', () => {
    const ld = {
      '@context': 'https://schema.org',
      '@type': 'JobPosting',
      title: 'Engineer',
      hiringOrganization: 'Acme',
      jobLocation: [{ '@type': 'Place', address: { addressLocality: 'Berlin' } }],
      description: 'd',
    }
    const html = `<script type="application/ld+json">${JSON.stringify(ld)}</script>`
    const out = extractFromDocument(docFrom(html), 'https://boards.greenhouse.io/x/jobs/1')
    expect(out).toMatchObject({ title: 'Engineer', company: 'Acme', location: 'Berlin' })
  })

  it('falls back to the generic extractor when a known site yields nothing', () => {
    const html = `<meta property="og:title" content="Fallback Role"><meta property="og:site_name" content="SomeCo">`
    const out = extractFromDocument(docFrom(html), 'https://www.linkedin.com/jobs/view/999')
    expect(out.platform).toBe('generic')
    expect(out).toMatchObject({ title: 'Fallback Role', company: 'SomeCo' })
  })
})
