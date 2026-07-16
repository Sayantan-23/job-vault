import type { JobStatus } from '@/lib/job-status'

export interface KanbanCard {
  id: string
  title: string
  company: string
  location: string | null
  ghostDays: number
  status: JobStatus
  kanbanOrder: number
  lastActivityAt: string | null
  createdAt: string
  outreachCount?: number
  outreachReplies?: number
}

export interface KanbanColumn {
  status: JobStatus
  jobs: KanbanCard[]
}

export interface DashboardStats {
  totalJobs: number
  byStatus: Record<JobStatus, number>
  ghostAlerts: number
  recentActivity: number
}

export interface KanbanBoard {
  columns: KanbanColumn[]
  stats: DashboardStats
}
