import type { JobStatus } from '@/lib/job-status'

export type GhostFilter = 'all' | 'active' | 'stale' | 'ghost'
export type SortField = 'title' | 'company' | 'createdAt' | 'updatedAt' | 'lastActivityAt'
export type SortOrder = 'asc' | 'desc'

export interface JobFilters {
  search: string
  status?: JobStatus
  createdFrom?: string
  createdTo?: string
  ghost: GhostFilter
  sortBy: SortField
  sortOrder: SortOrder
  page: number
  // Mobile-only: the web never sends `limit` (stuck at the backend's default 20);
  // mobile useInfiniteJobs sends 30 per page. Optional so the offset-paginated
  // shape still validates without it.
  limit?: number
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

export const GHOST_OPTIONS: readonly { value: GhostFilter; label: string }[] = [
  { value: 'all', label: 'All activity' },
  { value: 'active', label: 'Active (≤7d)' },
  { value: 'stale', label: 'Stale (8–14d)' },
  { value: 'ghost', label: 'Ghosted (>14d)' },
]
