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

// The JobVault WEB APP origin (not the backend). It serves /extension/authorize
// and proxies /api/* to the backend, so a single base covers the connect page,
// the X-API-Key calls, and the "open in app" links.
export const DEFAULT_SERVER_URL = 'http://localhost:8080'
