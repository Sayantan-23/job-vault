import type { JobStatus } from '@/lib/job-status'

export interface Job {
  id: string
  createdAt: string
  updatedAt: string
  userId: string
  title: string
  company: string
  location: string | null
  salaryRange: string | null
  sourceUrl: string | null
  snapshotMarkdown: string | null
  status: JobStatus
  kanbanOrder: number
  lastActivityAt: string | null
  ghostDays: number
  notes: string | null
}

export interface ScrapeResult {
  title: string
  company: string
  location?: string
  salaryRange?: string
  snapshotMarkdown: string
}
