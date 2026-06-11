import { z } from 'zod'
import { ProfileContentSchema } from '@/shared/profile-content.schema.js'

export const CreatePersonaSchema = z.object({
  name: z.string().min(1).max(100),
  data: ProfileContentSchema,
  rawInput: z.string().max(100_000).nullable().optional(),
})

export const UpdatePersonaSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    data: ProfileContentSchema.optional(),
  })
  .refine((v) => v.name !== undefined || v.data !== undefined, { message: 'Nothing to update' })

export type CreatePersonaInput = z.infer<typeof CreatePersonaSchema>
export type UpdatePersonaInput = z.infer<typeof UpdatePersonaSchema>
