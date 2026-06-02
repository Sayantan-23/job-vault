import { z } from 'zod'
import { JOB_STATUSES } from '@/db/schema/jobs.js'

const SORT_FIELDS = ['createdAt', 'updatedAt', 'title', 'company', 'kanbanOrder', 'lastActivityAt'] as const

export const CreateJobSchema = z.object({
  title: z.string().min(1).max(255),
  company: z.string().min(1).max(255),
  location: z.string().max(255).optional(),
  salaryRange: z.string().max(255).optional(),
  sourceUrl: z.string().url().max(2000).optional(),
  snapshotMarkdown: z.string().optional(),
  status: z.enum(JOB_STATUSES).optional(),
  notes: z.string().optional(),
})

export const UpdateJobSchema = CreateJobSchema.partial()

export const MoveJobSchema = z.object({
  status: z.enum(JOB_STATUSES),
  kanbanOrder: z.number(),
})

export const ScrapeUrlSchema = z.object({
  sourceUrl: z.string().url().max(2000),
})

export const JobQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.enum(SORT_FIELDS).default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
  search: z.string().optional(),
  status: z.enum(JOB_STATUSES).optional(),
  ghostFilter: z.enum(['all', 'active', 'stale', 'ghost']).optional(),
})

export type CreateJobInput = z.infer<typeof CreateJobSchema>
export type UpdateJobInput = z.infer<typeof UpdateJobSchema>
export type MoveJobInput = z.infer<typeof MoveJobSchema>
export type ScrapeUrlInput = z.infer<typeof ScrapeUrlSchema>
export type JobQueryInput = z.infer<typeof JobQuerySchema>
export type JobSortField = (typeof SORT_FIELDS)[number]
