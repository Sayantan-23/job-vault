import { z } from 'zod'

export const AdhocJobInputSchema = z.object({
  title: z.string().trim().min(1).max(255),
  company: z.string().trim().min(1).max(255),
  description: z.string().max(50_000).optional(),
})

export const GenerateCoverLetterSchema = z
  .object({
    personaId: z.string().uuid(),
    instructions: z.string().max(2000).optional(),
    jobId: z.string().uuid().optional(),
    job: AdhocJobInputSchema.optional(),
  })
  .refine((v) => (v.jobId !== undefined) !== (v.job !== undefined), {
    message: 'Provide exactly one of jobId or job',
  })

export const UpdateCoverLetterSchema = z
  .object({
    title: z.string().max(200).optional(),
    bodyMarkdown: z.string().min(1).max(50000).optional(),
  })
  .refine((v) => v.title !== undefined || v.bodyMarkdown !== undefined, { message: 'Nothing to update' })

export const CoverLetterQuerySchema = z.object({ jobId: z.string().uuid().optional() })

export type AdhocJobInput = z.infer<typeof AdhocJobInputSchema>
export type GenerateCoverLetterInput = z.infer<typeof GenerateCoverLetterSchema>
export type UpdateCoverLetterInput = z.infer<typeof UpdateCoverLetterSchema>
export type CoverLetterQuery = z.infer<typeof CoverLetterQuerySchema>
