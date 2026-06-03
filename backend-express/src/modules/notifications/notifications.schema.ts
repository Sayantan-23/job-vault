import { z } from 'zod'

export const NotificationQuerySchema = z.object({
  unreadOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
})

export const NotificationIdParamSchema = z.object({
  id: z.string().uuid(),
})

export type NotificationQueryInput = z.infer<typeof NotificationQuerySchema>
