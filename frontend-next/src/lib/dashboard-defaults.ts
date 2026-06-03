import type { JobStatus } from '@/lib/job-status'
import type { DashboardStats, KanbanBoard } from '@/types/dashboard'

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
