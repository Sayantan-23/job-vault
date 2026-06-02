import { z } from 'zod'
import { JOB_STATUSES } from '@/lib/job-status'

export const ManualJobSchema = z.object({
  title: z.string().min(1, 'Title is required').max(255),
  company: z.string().min(1, 'Company is required').max(255),
  location: z.string().max(255).optional(),
  salaryRange: z.string().max(255).optional(),
  sourceUrl: z.union([z.string().url('Enter a valid URL'), z.literal('')]).optional(),
  status: z.enum(JOB_STATUSES).optional(),
  notes: z.string().optional(),
})

export const ScrapeUrlSchema = z.object({
  sourceUrl: z.string().url('Enter a valid URL'),
})

export const UpdateJobSchema = ManualJobSchema.partial()

export type ManualJobValues = z.infer<typeof ManualJobSchema>
export type ScrapeUrlValues = z.infer<typeof ScrapeUrlSchema>
export type UpdateJobValues = z.infer<typeof UpdateJobSchema>
