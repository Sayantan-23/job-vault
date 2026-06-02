import { z } from 'zod'
import { JOB_STATUSES, type JobStatus } from '@/db/schema/jobs.js'

export const DashboardQuerySchema = z.object({
  search: z.string().optional(),
  status: z.enum(JOB_STATUSES).optional(),
  ghostFilter: z.enum(['all', 'active', 'stale', 'ghost']).optional(),
})

export type DashboardQueryInput = z.infer<typeof DashboardQuerySchema>

export interface KanbanCard {
  id: string
  title: string
  company: string
  location: string | null
  ghostDays: number
  status: JobStatus
  kanbanOrder: number
  lastActivityAt: Date | null
  createdAt: Date
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

export interface KanbanBoardResponse {
  columns: KanbanColumn[]
  stats: DashboardStats
}
