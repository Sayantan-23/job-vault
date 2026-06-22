import type { ExtractedJobData } from '@/lib/types'
import { scoreConfidence } from '@/lib/confidence'
import { canonicalUrl } from '../detector'
import { firstText, firstContainer, firstElement } from './dom'
import { descriptionToMarkdown } from './markdown'

// Scope to the focused detail pane so the split-pane search layout
// (…/jobs/search?currentJobId=…) extracts the SELECTED job, not a list card or
// the page header. Falls back to the whole document for the standalone
// /jobs/view/<id> page.
const CONTAINER = [
  '.jobs-search__job-details',
  '.jobs-details',
  '.job-view-layout',
  '.jobs-details__main-content',
]
const TITLE = [
  '.job-details-jobs-unified-top-card__job-title',
  '.jobs-unified-top-card__job-title',
  '.topcard__title',
  'h1',
]
const COMPANY = [
  '.job-details-jobs-unified-top-card__company-name',
  '.jobs-unified-top-card__company-name',
  '.topcard__org-name-link',
  // NB: deliberately no unanchored `a[data-test-app-aware-link]` fallback — it
  // matches nav/job-card links, so if the container scoping ever fails it would
  // yield a confidently-wrong company AND suppress the generic fallback.
]
const LOCATION = [
  '.job-details-jobs-unified-top-card__primary-description-container',
  '.jobs-unified-top-card__primary-description',
  '.topcard__flavor--bullet',
]
const DESCRIPTION = ['.jobs-description__content', '.show-more-less-html__markup', '#job-details']

export function extractLinkedIn(doc: Document, pageUrl: string): ExtractedJobData {
  const root = firstContainer(doc, CONTAINER)
  const title = firstText(root, TITLE)
  const company = firstText(root, COMPANY)
  return {
    title: title ?? '',
    company: company ?? '',
    location: firstText(root, LOCATION),
    description: descriptionToMarkdown(firstElement(root, DESCRIPTION)?.innerHTML),
    sourceUrl: canonicalUrl(pageUrl),
    platform: 'linkedin',
    confidence: scoreConfidence({ title, company }),
  }
}
