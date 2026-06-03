import { z } from 'zod'

export const CreateReminderSchema = z.object({
  message: z.string().min(1).max(500),
  remindAt: z.coerce.date(),
})

export const UpdateReminderSchema = z
  .object({
    message: z.string().min(1).max(500),
    remindAt: z.coerce.date(),
    isCompleted: z.boolean(),
  })
  .partial()

export const ReminderIdParamSchema = z.object({
  id: z.string().uuid(),
})

export type CreateReminderInput = z.infer<typeof CreateReminderSchema>
export type UpdateReminderInput = z.infer<typeof UpdateReminderSchema>
