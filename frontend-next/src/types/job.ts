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

export type ScrapeStatus = 'ok' | 'partial' | 'empty'

export interface ScrapeResult {
  title: string
  company: string
  location?: string
  salaryRange?: string
  snapshotMarkdown: string
  // How confident the backend is in the capture: 'ok' → show the preview,
  // 'partial'/'empty' → route the user to manual entry pre-filled. Older API
  // responses may omit it (treated as 'ok').
  status?: ScrapeStatus
  source?: 'static' | 'render' | 'ai'
}
