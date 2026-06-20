import type { Confidence } from './types'

// 'ok' needs both title and company (what a job save requires); 'partial' has one
// of them; 'empty' has neither. The popup uses this to decide pre-fill vs. backend
// scrape fallback vs. manual entry.
export function scoreConfidence(fields: { title?: string; company?: string }): Confidence {
  const hasTitle = Boolean(fields.title?.trim())
  const hasCompany = Boolean(fields.company?.trim())
  if (hasTitle && hasCompany) return 'ok'
  if (hasTitle || hasCompany) return 'partial'
  return 'empty'
}
