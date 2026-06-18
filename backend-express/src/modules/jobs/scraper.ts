import * as cheerio from 'cheerio'
import { htmlToMarkdown, sanitizeSnapshotMarkdown } from './markdown.js'
import { safeFetch, readTextCapped } from './safe-fetch.js'

// How confident we are in the captured result, surfaced to the client so it can
// degrade gracefully: 'ok' → show the preview, 'partial'/'empty' → route the
// user to manual entry pre-filled with whatever we got (never lose the job).
export type ScrapeStatus = 'ok' | 'partial' | 'empty'

// Which tier produced the result (telemetry + lets the client/render chain
// reason about provenance): the static fetch, a JS render provider, or the AI.
export type ScrapeSource = 'static' | 'render' | 'ai'

export interface ScrapeResult {
  title: string
  company: string
  location?: string
  salaryRange?: string
  snapshotMarkdown: string
  status: ScrapeStatus
  source: ScrapeSource
}

// A partial scrape result whose optional fields may be explicitly `undefined`.
// `finalize` merges values produced by `?? ` chains (which can be `undefined`),
// which `exactOptionalPropertyTypes` would otherwise reject for `Partial<…>`.
export type PartialScrape = { [K in keyof ScrapeResult]?: ScrapeResult[K] | undefined }

// Second-pass extractor invoked only when the static fetch yields a shell (a CSR
// SPA / bot-protected page). Renders the URL with a JS-capable provider and/or
// AI-extracts structured fields from the rendered content; see render.ts and the
// jobs service wiring. Returns `null` when it has nothing to add.
export type ScrapeFallback = (html: string, url: string) => Promise<PartialScrape | null>

const DEFAULT_TITLE = 'Untitled Position'
const DEFAULT_COMPANY = 'Unknown Company'
// Bound the persisted/returned snapshot so a huge rendered page can't bloat the
// response or the DB. Real descriptions are a few KB; this is generous headroom.
const MAX_SNAPSHOT_CHARS = 100_000

// Rewrites known multi-job / app-shell URLs to the canonical single-job page so
// we scrape one posting, not the whole search UI. The biggest win is LinkedIn:
// the desktop address bar shows `/jobs/search?currentJobId=<id>` (the full search
// page — no JobPosting JSON-LD, just chrome + other jobs), whereas
// `/jobs/view/<id>` is a clean server-rendered single-job page WITH JSON-LD.
export function normalizeJobUrl(rawUrl: string): string {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return rawUrl
  }
  const host = url.hostname.toLowerCase()
  if (host === 'linkedin.com' || host.endsWith('.linkedin.com')) {
    // Any LinkedIn page (search, collections, feed) carrying a selected job id.
    const currentJobId = url.searchParams.get('currentJobId')
    if (currentJobId && /^\d+$/.test(currentJobId)) {
      return `https://www.linkedin.com/jobs/view/${currentJobId}`
    }
    // /jobs/view/<slug>-<id> or /jobs/view/<id> → drop the slug + tracking params.
    const viewMatch = /\/jobs\/view\/(?:[^/?#]*-)?(\d+)/.exec(url.pathname)
    if (viewMatch) return `https://www.linkedin.com/jobs/view/${viewMatch[1]}`
  }
  return rawUrl
}

export async function scrapeUrl(rawUrl: string, fallback?: ScrapeFallback): Promise<ScrapeResult> {
  const url = normalizeJobUrl(rawUrl)
  // The static fetch can outright fail on bot-protected boards (Indeed/LinkedIn
  // return 403/429). Don't hard-fail when we have a render fallback to try — only
  // re-throw when there's nothing else to fall back to (preserves the plain
  // fetch-failure contract for callers that pass no fallback).
  let html: string | null = null
  try {
    html = await fetchHtml(url)
  } catch (err) {
    if (!fallback) throw err
  }

  const cheerioResult = html ? cheerioExtract(html, url) : {}

  if (isShellResult(cheerioResult) && fallback) {
    try {
      const fb = await fallback(html ?? '', url)
      if (fb) {
        return finalize({
          title: fb.title ?? cheerioResult.title,
          company: fb.company ?? cheerioResult.company,
          location: fb.location ?? cheerioResult.location,
          salaryRange: fb.salaryRange ?? cheerioResult.salaryRange,
          snapshotMarkdown: fb.snapshotMarkdown ?? cheerioResult.snapshotMarkdown,
          source: fb.source ?? 'render',
        })
      }
    } catch {
      // Fallback is best-effort; fall through to a finalized (likely empty) result
      // so the client can route the user to manual entry.
    }
  }

  return finalize(cheerioResult)
}

function isPlaceholderOrEmpty(value: string | undefined, placeholder: string): boolean {
  const v = value?.trim()
  return !v || v === placeholder
}

// A snapshot is "empty" when, after sanitization (which deletes decoy/`data:`
// images), no actual word characters remain — i.e. the page gave us nothing but
// chrome and anti-scrape pixels.
function isSnapshotEmpty(markdown: string | undefined): boolean {
  if (!markdown) return true
  return !/[a-z0-9]/i.test(sanitizeSnapshotMarkdown(markdown))
}

// Bot-challenge / anti-bot interstitials (Cloudflare "Just a moment…", captcha
// walls, "verify you are human") look like real pages but carry no job content.
// We must never persist them as the job, and they should route the user to manual
// entry. Matched against the title and the snapshot text.
const INTERSTITIAL_RE =
  /just a moment|verify you are human|attention required|checking your browser|enable javascript and cookies|please enable cookies|access denied|unusual traffic|are you a robot|cf-browser-verification|needs to review the security/i

export function looksLikeInterstitial(...parts: (string | undefined)[]): boolean {
  return parts.some((p) => !!p && INTERSTITIAL_RE.test(p))
}

// True when the static fetch failed to capture the essentials — missing/placeholder
// title or company, a snapshot that's empty once decoys are stripped, or a bot
// interstitial. This is the signal to escalate to the render+AI fallback.
export function isShellResult(p: PartialScrape): boolean {
  return (
    isPlaceholderOrEmpty(p.title, DEFAULT_TITLE) ||
    isPlaceholderOrEmpty(p.company, DEFAULT_COMPANY) ||
    isSnapshotEmpty(p.snapshotMarkdown) ||
    looksLikeInterstitial(p.title, p.snapshotMarkdown)
  )
}

function computeStatus(r: { title: string; company: string; snapshotMarkdown: string }): ScrapeStatus {
  const titleReal = !isPlaceholderOrEmpty(r.title, DEFAULT_TITLE)
  const companyReal = !isPlaceholderOrEmpty(r.company, DEFAULT_COMPANY)
  const hasSnapshot = !isSnapshotEmpty(r.snapshotMarkdown)
  if (!titleReal && !companyReal) return 'empty'
  if (titleReal && companyReal && hasSnapshot) return 'ok'
  return 'partial'
}

function finalize(p: PartialScrape): ScrapeResult {
  let title = p.title?.trim() || DEFAULT_TITLE
  let company = p.company?.trim() || DEFAULT_COMPANY
  // Sanitize unconditionally (the static path already does, but render/AI
  // markdown arrives here unscrubbed) and clamp the length.
  let snapshotMarkdown = sanitizeSnapshotMarkdown(p.snapshotMarkdown ?? '').slice(0, MAX_SNAPSHOT_CHARS)
  // A bot interstitial isn't real content — never persist "Just a moment…" as the
  // job. Blank it so the result reports 'empty' and the client routes to manual.
  if (looksLikeInterstitial(title, snapshotMarkdown)) {
    title = DEFAULT_TITLE
    company = DEFAULT_COMPANY
    snapshotMarkdown = ''
  }
  const result: ScrapeResult = {
    title,
    company,
    snapshotMarkdown,
    status: computeStatus({ title, company, snapshotMarkdown }),
    source: p.source ?? 'static',
  }
  if (p.location) result.location = p.location
  if (p.salaryRange) result.salaryRange = p.salaryRange
  return result
}

// Cap the buffered body so a huge (or slow-drip) page can't exhaust memory.
const MAX_HTML_BYTES = 5_000_000

async function fetchHtml(url: string): Promise<string> {
  // safeFetch applies the SSRF guard (incl. per-redirect-hop + connect-time IP
  // validation) so a user URL can never reach a private/loopback/metadata target.
  const response = await safeFetch(url, {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    timeoutMs: 15000,
  })
  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`)
  }
  return readTextCapped(response, MAX_HTML_BYTES)
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
  if (!result.company) {
    // Many ATS title pages read "Job Application for {title} at {Company}" — pull
    // the company off the tail of og:title / <title> as a last resort.
    const c = parseCompanyFromTitle($('meta[property="og:title"]').attr('content') || $('title').text())
    if (c) result.company = c
  }

  // 4. main-content → markdown if we still have no snapshot. Try known
  // job-description containers first (LinkedIn's JSON-LD often omits the
  // description, and dumping <body> drags in nav / "sign in" / other-jobs chrome)
  // before falling back to the page's main region and finally the whole body.
  if (!result.snapshotMarkdown) {
    const main =
      $('.show-more-less-html__markup').html() || // LinkedIn public JD body
      $('.description__text').html() || // LinkedIn JD wrapper
      $('.jobs-description__content').html() || // LinkedIn (authed) JD
      $('.job-description').html() ||
      $('#job-description').html() ||
      $('[data-testid="jobsearch-JobComponent-description"]').html() || // Indeed JD
      $('main').html() ||
      $('[role="main"]').html() ||
      $('article').html() ||
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
    // Modern Greenhouse boards dropped the legacy `#header .app-title` markup; try
    // the current selectors first, then fall back to the old ones.
    set(
      'title',
      $('.job__title h1').text() || $('h1.app-title').text() || $('#header .app-title').text(),
    )
    set('company', $('.company-name').text() || $('#header .company-name').text())
    set('location', $('.job__location').first().text() || $('.location').first().text())
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

// Extracts a company name from a "… at {Company}" page title (the common ATS
// "Job Application for {role} at {Company}" template). Heuristic guards keep it
// from capturing generic sentence tails — "operate at scale" → "scale",
// "at the forefront of innovation" — by requiring a proper-noun shape: starts
// with a capital/digit, at most a few words. Returns undefined otherwise.
function parseCompanyFromTitle(title: string | undefined): string | undefined {
  if (!title) return undefined
  const match = /\bat\s+([^|–—-]+?)\s*$/i.exec(title.trim())
  const company = match?.[1]?.trim()
  if (!company || company.length < 2 || company.length > 100) return undefined
  // Brand names are proper nouns: capital/number first char, not a lowercase tail.
  if (!/^[A-Z0-9]/.test(company)) return undefined
  // A real company name is short; a captured clause is long.
  if (company.split(/\s+/).length > 6) return undefined
  return company
}
