import { z } from 'zod'

export const CreateTimelineEntrySchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
})

export type CreateTimelineEntryInput = z.infer<typeof CreateTimelineEntrySchema>

// Pagination for the user-scoped global feed (GET /api/timeline). Mirrors the
// jobs list: page is 1-based, limit capped at 100; defaults to a 50-row page.
export const TimelineQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
})

export type TimelineQueryInput = z.infer<typeof TimelineQuerySchema>
