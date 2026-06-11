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

// parse-resume body — `text` may arrive as a multipart field (multer) or as a
// JSON body; the PDF itself comes through multer (`req.file`), not this schema.
// `.default({})` covers requests that carry only a file (no parsed body).
export const ParseResumeSchema = z.object({ text: z.string().optional() }).default({})

export type CreatePersonaInput = z.infer<typeof CreatePersonaSchema>
export type UpdatePersonaInput = z.infer<typeof UpdatePersonaSchema>
export type ParseResumeInput = z.infer<typeof ParseResumeSchema>
