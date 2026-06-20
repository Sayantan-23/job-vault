export type Platform = 'linkedin' | 'indeed' | 'generic'

// Mirrors the web app's scrape confidence: 'ok' has the essentials, 'partial' is
// missing one, 'empty' has neither — drives whether the popup pre-fills or falls
// back to the backend scrape / manual entry.
export type Confidence = 'ok' | 'partial' | 'empty'

export interface ExtractedJobData {
  title: string
  company: string
  location?: string
  salaryRange?: string
  description?: string
  sourceUrl: string
  platform: Platform
  confidence: Confidence
}

export interface ExtensionSettings {
  serverUrl: string
}

export const DEFAULT_SERVER_URL = 'http://localhost:3100'
