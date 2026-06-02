import * as cheerio from 'cheerio'
import { htmlToMarkdown } from './markdown.js'

export interface ScrapeResult {
  title: string
  company: string
  location?: string
  salaryRange?: string
  snapshotMarkdown: string
}

/** Optional second-pass extractor (e.g. an LLM). Wired in by the AI slice. */
export type ScrapeFallback = (html: string, url: string) => Promise<Partial<ScrapeResult>>

// A partial scrape result whose optional fields may be explicitly `undefined`.
// `finalize` merges values produced by `?? ` chains (which can be `undefined`),
// which `exactOptionalPropertyTypes` would otherwise reject for `Partial<…>`.
type PartialScrape = { [K in keyof ScrapeResult]?: ScrapeResult[K] | undefined }

const DEFAULT_TITLE = 'Untitled Position'
const DEFAULT_COMPANY = 'Unknown Company'

export async function scrapeUrl(url: string, fallback?: ScrapeFallback): Promise<ScrapeResult> {
  const html = await fetchHtml(url)
  const cheerioResult = cheerioExtract(html, url)

  if ((!cheerioResult.title || !cheerioResult.company) && fallback) {
    try {
      const fb = await fallback(html, url)
      return finalize({
        title: fb.title ?? cheerioResult.title,
        company: fb.company ?? cheerioResult.company,
        location: fb.location ?? cheerioResult.location,
        salaryRange: fb.salaryRange ?? cheerioResult.salaryRange,
        snapshotMarkdown: fb.snapshotMarkdown ?? cheerioResult.snapshotMarkdown,
      })
    } catch {
      // Fallback is best-effort; fall through to the Cheerio result.
    }
  }

  return finalize(cheerioResult)
}

function finalize(p: PartialScrape): ScrapeResult {
  const result: ScrapeResult = {
    title: p.title || DEFAULT_TITLE,
    company: p.company || DEFAULT_COMPANY,
    snapshotMarkdown: p.snapshotMarkdown ?? '',
  }
  if (p.location) result.location = p.location
  if (p.salaryRange) result.salaryRange = p.salaryRange
  return result
}

async function fetchHtml(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    signal: AbortSignal.timeout(15000),
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`)
  }
  return response.text()
}

function cheerioExtract(html: string, url: string): Partial<ScrapeResult> {
  const $ = cheerio.load(html)
  const result: Partial<ScrapeResult> = {}

  // 1. schema.org JobPosting JSON-LD
  const jsonLd = extractJsonLd($)
  if (jsonLd) {
    if (typeof jsonLd['title'] === 'string') result.title = jsonLd['title']
    const company = companyFromJsonLd(jsonLd)
    if (company) result.company = company
    const location = locationFromJsonLd(jsonLd)
    if (location) result.location = location
    const salary = salaryFromJsonLd(jsonLd)
    if (salary) result.salaryRange = salary
    if (typeof jsonLd['description'] === 'string') {
      result.snapshotMarkdown = htmlToMarkdown(jsonLd['description'])
    }
  }

  // 2. platform-specific selectors
  if (!result.title || !result.company) {
    const platform = extractFromPlatformSelectors($, url)
    if (!result.title && platform.title) result.title = platform.title
    if (!result.company && platform.company) result.company = platform.company
    if (!result.location && platform.location) result.location = platform.location
  }

  // 3. generic fallbacks
  if (!result.title) {
    const t =
      $('h1').first().text().trim() ||
      $('title').text().trim() ||
      $('meta[property="og:title"]').attr('content')?.trim()
    if (t) result.title = t
  }
  if (!result.company) {
    const c = $('meta[property="og:site_name"]').attr('content')?.trim()
    if (c) result.company = c
  }

  // 4. main-content → markdown if we still have no snapshot
  if (!result.snapshotMarkdown) {
    const main =
      $('main').html() ||
      $('[role="main"]').html() ||
      $('article').html() ||
      $('.job-description').html() ||
      $('#job-description').html() ||
      $('body').html()
    if (main) result.snapshotMarkdown = htmlToMarkdown(main)
  }

  return result
}

function extractJsonLd($: cheerio.CheerioAPI): Record<string, unknown> | null {
  let jobPosting: Record<string, unknown> | null = null
  $('script[type="application/ld+json"]').each((_, el) => {
    try {
      const raw = $(el).text() || ''
      const data: unknown = JSON.parse(raw)
      const items = Array.isArray(data) ? data : [data]
      for (const item of items) {
        if (!item || typeof item !== 'object') continue
        const obj = item as Record<string, unknown>
        if (obj['@type'] === 'JobPosting') {
          jobPosting = obj
          return false
        }
        const graph = obj['@graph']
        if (Array.isArray(graph)) {
          const found = graph.find(
            (g) => g && typeof g === 'object' && (g as Record<string, unknown>)['@type'] === 'JobPosting',
          )
          if (found) {
            jobPosting = found as Record<string, unknown>
            return false
          }
        }
      }
      return undefined
    } catch {
      return undefined
    }
  })
  return jobPosting
}

function companyFromJsonLd(jsonLd: Record<string, unknown>): string | undefined {
  const org = jsonLd['hiringOrganization']
  if (typeof org === 'string') return org
  if (org && typeof org === 'object') {
    const name = (org as Record<string, unknown>)['name']
    if (typeof name === 'string') return name
  }
  return undefined
}

function locationFromJsonLd(jsonLd: Record<string, unknown>): string | undefined {
  const loc = jsonLd['jobLocation']
  if (!loc) return undefined
  const locations = Array.isArray(loc) ? loc : [loc]
  const parts: string[] = []
  for (const l of locations) {
    if (!l || typeof l !== 'object') continue
    const address = (l as Record<string, unknown>)['address']
    if (address && typeof address === 'object') {
      const a = address as Record<string, unknown>
      const part = [a['addressLocality'], a['addressRegion'], a['addressCountry']]
        .filter((x): x is string => typeof x === 'string' && x.length > 0)
        .join(', ')
      if (part) parts.push(part)
    }
  }
  return parts.length > 0 ? parts.join(' | ') : undefined
}

function salaryFromJsonLd(jsonLd: Record<string, unknown>): string | undefined {
  const salary = jsonLd['baseSalary']
  if (!salary || typeof salary !== 'object') return undefined
  const s = salary as Record<string, unknown>
  const currency = typeof s['currency'] === 'string' ? (s['currency'] as string) : ''
  const value = s['value']
  if (typeof value === 'number') return `${currency} ${value}`.trim()
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>
    const min = v['minValue']
    const max = v['maxValue']
    const unit = typeof v['unitText'] === 'string' ? (v['unitText'] as string) : ''
    if (typeof min === 'number' && typeof max === 'number') {
      return `${currency} ${min} - ${max} ${unit}`.trim()
    }
    if (typeof min === 'number') return `${currency} ${min}+ ${unit}`.trim()
  }
  return undefined
}

function extractFromPlatformSelectors($: cheerio.CheerioAPI, url: string): Partial<ScrapeResult> {
  const result: Partial<ScrapeResult> = {}
  const set = (key: 'title' | 'company' | 'location', value: string): void => {
    const v = value.trim()
    if (v) result[key] = v
  }

  if (url.includes('linkedin.com')) {
    set('title', $('.top-card-layout__title').text() || $('h1.topcard__title').text())
    set(
      'company',
      $('.topcard__org-name-link').text() ||
        $('a.topcard__org-name-link').text() ||
        $('.top-card-layout__company-name').text(),
    )
    set('location', $('.topcard__flavor--bullet').text() || $('.top-card-layout__bullet').text())
  } else if (url.includes('indeed.com')) {
    set(
      'title',
      $('[data-testid="jobsearch-JobInfoHeader-title"]').text() ||
        $('.jobsearch-JobInfoHeader-title').text() ||
        $('h1.icl-u-xs-mb--xs').text(),
    )
    set(
      'company',
      $('[data-testid="inlineHeader-companyName"]').text() || $('[data-company-name="true"]').text(),
    )
    set(
      'location',
      $('[data-testid="job-location"]').text() || $('[data-testid="inlineHeader-companyLocation"]').text(),
    )
  } else if (url.includes('greenhouse.io')) {
    set('title', $('#header .app-title').text())
    set('company', $('#header .company-name').text())
    set('location', $('.location').first().text())
  } else if (url.includes('lever.co')) {
    set('title', $('h2.posting-headline').text() || $('.posting-headline h2').text())
    set('company', $('[data-qa="company-name"]').text())
    set(
      'location',
      $('[data-qa="posting-categories"]').find('.sort-by-time').first().text() ||
        $('.posting-categories .location').text(),
    )
  }

  return result
}
