import { z } from 'zod'

export const CreateTimelineEntrySchema = z.object({
  title: z.string().min(1).max(255),
  description: z.string().optional(),
})

export type CreateTimelineEntryInput = z.infer<typeof CreateTimelineEntrySchema>
