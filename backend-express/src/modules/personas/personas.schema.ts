import { z } from 'zod'
import { ResumeContentSchema } from '@/shared/resume-content.schema.js'

export const PersonaInputsSchema = z
  .object({
    freeText: z.string().max(20000).optional(),
    pastedResume: z.string().max(50000).optional(),
    fields: ResumeContentSchema.partial().optional(),
  })
  .refine((v) => Boolean(v.freeText || v.pastedResume || v.fields), {
    message: 'Provide a pasted résumé, free text, or fields',
  })

export const CreatePersonaSchema = z.object({
  name: z.string().min(1).max(100),
  inputs: PersonaInputsSchema,
})

export const UpdatePersonaSchema = z
  .object({
    name: z.string().min(1).max(100).optional(),
    data: ResumeContentSchema.optional(),
  })
  .refine((v) => v.name !== undefined || v.data !== undefined, { message: 'Nothing to update' })

export type PersonaInputs = z.infer<typeof PersonaInputsSchema>
export type CreatePersonaInput = z.infer<typeof CreatePersonaSchema>
export type UpdatePersonaInput = z.infer<typeof UpdatePersonaSchema>
