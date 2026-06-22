import type { Platform } from '@/lib/types'

export function detectPlatform(rawUrl: string): Platform {
  let host: string
  try {
    host = new URL(rawUrl).hostname.toLowerCase()
  } catch {
    return 'generic'
  }
  if (host === 'linkedin.com' || host.endsWith('.linkedin.com')) return 'linkedin'
  if (host === 'indeed.com' || host.endsWith('.indeed.com')) return 'indeed'
  return 'generic'
}

// Canonical single-job URL used as the stored sourceUrl (and for dedup). Mirrors
// the backend's normalizeJobUrl so a job saved via the extension dedups against
// one saved via the web app.
export function canonicalUrl(rawUrl: string): string {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return rawUrl
  }
  const host = url.hostname.toLowerCase()
  if (host === 'linkedin.com' || host.endsWith('.linkedin.com')) {
    const currentJobId = url.searchParams.get('currentJobId')
    if (currentJobId && /^\d+$/.test(currentJobId)) {
      return `https://www.linkedin.com/jobs/view/${currentJobId}`
    }
    const viewMatch = /\/jobs\/view\/(?:[^/?#]*-)?(\d+)/.exec(url.pathname)
    if (viewMatch) return `https://www.linkedin.com/jobs/view/${viewMatch[1]}`
  }
  return rawUrl
}
