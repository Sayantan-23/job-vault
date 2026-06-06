import { z } from 'zod'

export const GenerateCoverLetterSchema = z.object({
  jobId: z.string().uuid(),
  personaId: z.string().uuid(),
  instructions: z.string().max(2000).optional(),
})

export const UpdateCoverLetterSchema = z
  .object({
    title: z.string().max(200).optional(),
    bodyMarkdown: z.string().min(1).max(50000).optional(),
  })
  .refine((v) => v.title !== undefined || v.bodyMarkdown !== undefined, { message: 'Nothing to update' })

export const CoverLetterQuerySchema = z.object({ jobId: z.string().uuid().optional() })

export type GenerateCoverLetterInput = z.infer<typeof GenerateCoverLetterSchema>
export type UpdateCoverLetterInput = z.infer<typeof UpdateCoverLetterSchema>
export type CoverLetterQuery = z.infer<typeof CoverLetterQuerySchema>
