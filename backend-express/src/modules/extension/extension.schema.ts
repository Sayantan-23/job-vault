import { z } from 'zod'

// Quick-create from a content-script extraction. A thin superset of the job
// create schema: `description` is accepted as a friendly alias and mapped to
// snapshotMarkdown by the service when snapshotMarkdown isn't supplied.
export const QuickCreateJobSchema = z.object({
  title: z.string().trim().min(1).max(255),
  company: z.string().trim().min(1).max(255),
  location: z.string().max(255).optional(),
  salaryRange: z.string().max(255).optional(),
  sourceUrl: z.string().url().max(2000).optional(),
  snapshotMarkdown: z.string().max(200_000).optional(),
  description: z.string().max(200_000).optional(),
})

export const CheckUrlSchema = z.object({
  url: z.string().url().max(2000),
})

export type QuickCreateJobInput = z.infer<typeof QuickCreateJobSchema>
export type CheckUrlInput = z.infer<typeof CheckUrlSchema>
