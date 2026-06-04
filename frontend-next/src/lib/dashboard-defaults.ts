import type { JobStatus } from '@/lib/job-status'
import type { DashboardStats, KanbanBoard } from '@/types/dashboard'
import type { Paginated } from '@/types/filters'
import type { Job } from '@/types/job'

const ZERO_BY_STATUS: Record<JobStatus, number> = {
  WISHLIST: 0, APPLIED: 0, INTERVIEWING: 0, OFFER: 0, REJECTED: 0, ARCHIVED: 0,
}

export const EMPTY_STATS: DashboardStats = {
  totalJobs: 0,
  byStatus: ZERO_BY_STATUS,
  ghostAlerts: 0,
  recentActivity: 0,
}

export const EMPTY_BOARD: KanbanBoard = {
  columns: [
    { status: 'WISHLIST', jobs: [] },
    { status: 'APPLIED', jobs: [] },
    { status: 'INTERVIEWING', jobs: [] },
    { status: 'OFFER', jobs: [] },
    { status: 'REJECTED', jobs: [] },
    { status: 'ARCHIVED', jobs: [] },
  ],
  stats: EMPTY_STATS,
}

export const EMPTY_JOBS_PAGE: Paginated<Job> = {
  data: [],
  meta: { total: 0, page: 1, limit: 20, totalPages: 0 },
}
