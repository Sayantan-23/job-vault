import { z } from 'zod'

// Length caps are guardrails against a pasted novel, not the UI's targets. The
// UI aims at ~500 characters for short and ~2000 for long, both shown as live
// character counts; these ceilings sit well above that on purpose.
const SHORT_MAX = 1000
const LONG_MAX = 5000

const nonEmpty = (value: string | undefined): boolean => (value ?? '').trim().length > 0

export const CreateAnswerSchema = z
  .object({
    question: z.string().trim().min(1).max(500),
    answerShort: z.string().trim().max(SHORT_MAX).optional(),
    answerLong: z.string().trim().max(LONG_MAX).optional(),
  })
  .refine((v) => nonEmpty(v.answerShort) || nonEmpty(v.answerLong), {
    message: 'Provide at least a short or a long answer',
  })

// A patch may legitimately blank ONE variant (the other still stands), so this
// deliberately does not re-run the at-least-one rule — the service does, against
// the merged row, where the question can actually be answered.
export const UpdateAnswerSchema = z
  .object({
    question: z.string().trim().min(1).max(500).optional(),
    answerShort: z.string().trim().max(SHORT_MAX).optional(),
    answerLong: z.string().trim().max(LONG_MAX).optional(),
  })
  .refine((v) => v.question !== undefined || v.answerShort !== undefined || v.answerLong !== undefined, {
    message: 'Nothing to update',
  })

export const GenerateAnswerSchema = z.object({
  question: z.string().trim().min(1).max(500),
  personaId: z.string().uuid(),
  jobId: z.string().uuid().optional(),
  instructions: z.string().trim().max(500).optional(),
})

export type CreateAnswerInput = z.infer<typeof CreateAnswerSchema>
export type UpdateAnswerInput = z.infer<typeof UpdateAnswerSchema>
export type GenerateAnswerInput = z.infer<typeof GenerateAnswerSchema>
