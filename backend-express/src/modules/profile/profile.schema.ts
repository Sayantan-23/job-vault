import { z } from 'zod'
import { ProfileContentSchema } from '@/shared/profile-content.schema.js'

export const UpdateProfileSchema = z.object({
  content: ProfileContentSchema,
})

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
