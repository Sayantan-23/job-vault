import type { JobFilters } from '@/types/filters'

export const JOBS_KEY = ['jobs'] as const
export const jobKey = (id: string) => ['jobs', id] as const

// Filtered list cache key (offset pagination, web). Nested under ['jobs', ...]
// so existing invalidateQueries({ queryKey: JOBS_KEY }) (prefix match) still
// refreshes it.
export const jobsListKey = (f: JobFilters) =>
  ['jobs', 'list', f.search, f.status ?? null, f.ghost, f.sortBy, f.sortOrder, f.page, f.createdFrom ?? null, f.createdTo ?? null] as const

// Infinite list cache key. Same shape as jobsListKey MINUS page — useInfiniteJobs
// keys each page by pageParam inside the InfiniteQuery, so the key itself must
// stay stable across fetches of the same filter set (else every page is a new
// query and forward navigation throws the cache away).
export const jobsInfiniteKey = (f: Omit<JobFilters, 'page'>) =>
  ['jobs', 'infinite', f.search, f.status ?? null, f.ghost, f.sortBy, f.sortOrder, f.createdFrom ?? null, f.createdTo ?? null] as const

export const TIMELINE_KEY = ['timeline'] as const
export const timelineKey = (jobId: string) => ['timeline', jobId] as const
export const contactsKey = (jobId: string) => ['contacts', jobId] as const
export const remindersKey = (jobId: string) => ['reminders', jobId] as const

export const ANSWERS_KEY = ['answers'] as const
export const PERSONAS_KEY = ['personas'] as const
export const AI_STATUS_KEY = ['ai-status'] as const

export const DASHBOARD_KANBAN_KEY = ['dashboard', 'kanban'] as const
export const kanbanKey = (filters?: { search?: string; ghost?: string }) =>
  ['dashboard', 'kanban', filters?.search ?? '', filters?.ghost ?? ''] as const
