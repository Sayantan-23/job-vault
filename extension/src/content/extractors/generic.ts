import type { ExtractedJobData } from '@/lib/types'
import { scoreConfidence } from '@/lib/confidence'
import { firstText, firstAttr, jobPostingJsonLd } from './dom'
import { descriptionToMarkdown } from './markdown'

function jsonLdString(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined
  return undefined
}

// schema.org JobPosting.hiringOrganization may be a string or an Organization.
function orgName(value: unknown): string | undefined {
  if (typeof value === 'string') return value.trim() || undefined
  if (value && typeof value === 'object' && 'name' in value) {
    return jsonLdString((value as { name: unknown }).name)
  }
  return undefined
}

function place(value: unknown): string | undefined {
  // jobLocation may be a single Place or an array of them (multi-office postings).
  const first = Array.isArray(value) ? value[0] : value
  if (first && typeof first === 'object') {
    const addr = (first as { address?: unknown }).address
    if (addr && typeof addr === 'object') {
      const a = addr as Record<string, unknown>
      return jsonLdString(a['addressLocality']) ?? jsonLdString(a['addressRegion'])
    }
  }
  return undefined
}

// Generic fallback: prefer schema.org JobPosting JSON-LD (covers Greenhouse/Lever/
// Ashby and many boards), then OpenGraph / <title> / <h1>.
export function extractGeneric(doc: Document, pageUrl: string): ExtractedJobData {
  const ld = jobPostingJsonLd(doc)

  const title =
    (ld && jsonLdString(ld['title'])) ??
    firstAttr(doc, [['meta[property="og:title"]', 'content']]) ??
    firstText(doc, ['h1']) ??
    firstText(doc, ['title'])

  const company =
    (ld && orgName(ld['hiringOrganization'])) ??
    firstAttr(doc, [
      ['meta[property="og:site_name"]', 'content'],
      ['meta[name="author"]', 'content'],
    ])

  const location = ld ? place(ld['jobLocation']) : undefined
  // schema.org JobPosting.description is typically HTML → convert to Markdown;
  // otherwise fall back to the plain-text meta description.
  const ldDescription = ld ? jsonLdString(ld['description']) : undefined
  const description = ldDescription
    ? descriptionToMarkdown(ldDescription)
    : firstAttr(doc, [['meta[name="description"]', 'content']])

  return {
    title: title ?? '',
    company: company ?? '',
    location,
    description,
    sourceUrl: pageUrl,
    platform: 'generic',
    confidence: scoreConfidence({ title, company }),
  }
}
