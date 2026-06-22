import type { ExtractedJobData } from '@/lib/types'
import { scoreConfidence } from '@/lib/confidence'
import { firstText, firstElement } from './dom'
import { descriptionToMarkdown } from './markdown'

// Indeed renders the focused job in a right-hand pane keyed by data-testid. We
// query the document (the pane is the only job-detail region present).
const TITLE = [
  '[data-testid="jobsearch-JobInfoHeader-title"]',
  '.jobsearch-JobInfoHeader-title',
  'h1.jobsearch-JobInfoHeader-title',
  'h1',
]
const COMPANY = [
  '[data-testid="inlineHeader-companyName"]',
  '[data-company-name="true"]',
  '.jobsearch-CompanyInfoContainer a',
]
const LOCATION = ['[data-testid="inlineHeader-companyLocation"]', '[data-testid="job-location"]']
const SALARY = ['#salaryInfoAndJobType', '[data-testid="jobsearch-OtherJobDetailsContainer"]']
const DESCRIPTION = ['#jobDescriptionText', '[data-testid="jobsearch-JobComponent-description"]']

export function extractIndeed(doc: Document, pageUrl: string): ExtractedJobData {
  const title = firstText(doc, TITLE)
  const company = firstText(doc, COMPANY)
  return {
    title: title ?? '',
    company: company ?? '',
    location: firstText(doc, LOCATION),
    salaryRange: firstText(doc, SALARY),
    description: descriptionToMarkdown(firstElement(doc, DESCRIPTION)?.innerHTML),
    sourceUrl: pageUrl,
    platform: 'indeed',
    confidence: scoreConfidence({ title, company }),
  }
}
