import { z } from 'zod'
import { CONTACT_CHANNELS, CONTACT_STATUSES } from '@/db/schema/job-contacts.js'

export const CreateContactSchema = z.object({
  contact: z.string().trim().min(1).max(500),
  channel: z.enum(CONTACT_CHANNELS).optional(),
  reachedOutAt: z.coerce.date().optional(),
  notes: z.string().max(2000).optional(),
})

export const UpdateContactSchema = z
  .object({
    contact: z.string().trim().min(1).max(500),
    channel: z.enum(CONTACT_CHANNELS).nullable(),
    status: z.enum(CONTACT_STATUSES),
    reachedOutAt: z.coerce.date(),
    notes: z.string().max(2000).nullable(),
  })
  .partial()
  .refine((patch) => Object.keys(patch).length > 0, { message: 'Patch must not be empty' })

export type CreateContactInput = z.infer<typeof CreateContactSchema>
export type UpdateContactInput = z.infer<typeof UpdateContactSchema>
