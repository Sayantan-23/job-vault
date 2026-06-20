import type { ExtractedJobData } from '@/lib/types'
import { detectPlatform } from './detector'
import { extractLinkedIn } from './extractors/linkedin'
import { extractIndeed } from './extractors/indeed'
import { extractGeneric } from './extractors/generic'

// Picks the right per-site extractor by URL. The generic extractor is the
// fallback both for unknown sites and for known sites whose markup changed.
export function extractFromDocument(doc: Document, pageUrl: string): ExtractedJobData {
  switch (detectPlatform(pageUrl)) {
    case 'linkedin': {
      const result = extractLinkedIn(doc, pageUrl)
      return result.confidence === 'empty' ? extractGeneric(doc, pageUrl) : result
    }
    case 'indeed': {
      const result = extractIndeed(doc, pageUrl)
      return result.confidence === 'empty' ? extractGeneric(doc, pageUrl) : result
    }
    default:
      return extractGeneric(doc, pageUrl)
  }
}
