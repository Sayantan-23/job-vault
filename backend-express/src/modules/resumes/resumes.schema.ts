import { z } from 'zod'
import { ResumeContentSchema } from '@/shared/resume-content.schema.js'

export const GenerateResumeSchema = z.object({
  personaId: z.string().uuid(),
  jobId: z.string().uuid().optional(),
  instructions: z.string().max(2000).optional(),
})

export const UpdateResumeSchema = z
  .object({
    title: z.string().max(200).optional(),
    content: ResumeContentSchema.optional(),
  })
  .refine((v) => v.title !== undefined || v.content !== undefined, { message: 'Nothing to update' })

export const ResumeQuerySchema = z.object({ jobId: z.string().uuid().optional() })

export type GenerateResumeInput = z.infer<typeof GenerateResumeSchema>
export type UpdateResumeInput = z.infer<typeof UpdateResumeSchema>
export type ResumeQuery = z.infer<typeof ResumeQuerySchema>
