import { z } from 'zod'

export const NotificationQuerySchema = z.object({
  unreadOnly: z
    .enum(['true', 'false'])
    .optional()
    .transform((v) => v === 'true'),
})

export type NotificationQueryInput = z.infer<typeof NotificationQuerySchema>
