import type { JobFilters, GhostFilter } from '@/types/filters'

export const JOBS_KEY = ['jobs'] as const
export const jobKey = (id: string) => ['jobs', id] as const
export const DASHBOARD_KANBAN_KEY = ['dashboard', 'kanban'] as const
export const DASHBOARD_STATS_KEY = ['dashboard', 'stats'] as const
export const TIMELINE_KEY = ['timeline'] as const
export const timelineKey = (jobId: string) => ['timeline', jobId] as const
// Global cross-job feed, paged. Nested under TIMELINE_KEY so a prefix
// invalidation of ['timeline'] still refreshes it.
export const globalTimelineKey = (page: number) => ['timeline', 'global', page] as const
export const NOTIFICATIONS_KEY = ['notifications'] as const
export const remindersKey = (jobId: string) => ['reminders', jobId] as const
export const contactsKey = (jobId: string) => ['contacts', jobId] as const

// Filtered list cache key. Nested under ['jobs', ...] so existing
// invalidateQueries({ queryKey: JOBS_KEY }) (prefix match) still refreshes it.
export const jobsListKey = (f: JobFilters) =>
  ['jobs', 'list', f.search, f.status ?? null, f.ghost, f.sortBy, f.sortOrder, f.page, f.createdFrom ?? null, f.createdTo ?? null] as const

// Filtered board cache key. Nested under ['dashboard','kanban', ...] so existing
// prefix invalidations still match.
export const kanbanKey = (f: { search: string; ghost: GhostFilter }) =>
  ['dashboard', 'kanban', f.search, f.ghost] as const

export const AI_STATUS_KEY = ['ai', 'status'] as const
export const PERSONAS_KEY = ['personas'] as const
export const personaKey = (id: string) => ['personas', id] as const

export const RESUMES_KEY = ['resumes'] as const
export const resumeKey = (id: string) => ['resumes', id] as const
export const resumesByJobKey = (jobId: string) => ['resumes', 'job', jobId] as const

export const COVER_LETTERS_KEY = ['cover-letters'] as const
export const coverLetterKey = (id: string) => ['cover-letters', id] as const
export const coverLettersByJobKey = (jobId: string) => ['cover-letters', 'job', jobId] as const

export const ANSWERS_KEY = ['answers'] as const

export const PROFILE_KEY = ['profile'] as const

// Global search. Keyed on the debounced term, so each settled term caches
// separately and re-typing an earlier one is instant.
export const searchKey = (q: string) => ['search', q] as const

// Extension API keys ("Connected apps"). Managed first-party in Settings.
export const API_KEYS_KEY = ['api-keys'] as const
