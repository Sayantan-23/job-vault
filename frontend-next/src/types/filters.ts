import type { JobStatus } from '@/lib/job-status'

export type GhostFilter = 'all' | 'active' | 'stale' | 'ghost'
export type SortField = 'title' | 'company' | 'createdAt' | 'updatedAt' | 'lastActivityAt'
export type SortOrder = 'asc' | 'desc'

export interface JobFilters {
  search: string
  status?: JobStatus
  ghost: GhostFilter
  sortBy: SortField
  sortOrder: SortOrder
  page: number
}

export interface PageMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface Paginated<T> {
  data: T[]
  meta: PageMeta
}

// The unfiltered defaults. Mirrors the backend's GET /api/jobs defaults exactly
// (sortBy=createdAt, sortOrder=desc, page=1) so an unfiltered URL is bare.
export const DEFAULT_FILTERS: JobFilters = {
  search: '',
  ghost: 'all',
  sortBy: 'createdAt',
  sortOrder: 'desc',
  page: 1,
}

// Sort fields exposed in the List UI: a strict subset of the backend SORT_FIELDS
// (kanbanOrder is intentionally excluded — not a meaningful user-facing sort).
export const SORT_OPTIONS: ReadonlyArray<{ value: SortField; label: string }> = [
  { value: 'createdAt', label: 'Date added' },
  { value: 'updatedAt', label: 'Last updated' },
  { value: 'lastActivityAt', label: 'Last activity' },
  { value: 'title', label: 'Title' },
  { value: 'company', label: 'Company' },
]

export const GHOST_OPTIONS: ReadonlyArray<{ value: GhostFilter; label: string }> = [
  { value: 'all', label: 'All activity' },
  { value: 'active', label: 'Active (≤7d)' },
  { value: 'stale', label: 'Stale (8–14d)' },
  { value: 'ghost', label: 'Ghosted (>14d)' },
]
