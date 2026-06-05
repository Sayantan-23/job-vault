import { z } from 'zod'

export const CreatePersonaFormSchema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100),
    pastedResume: z.string().max(50000).optional().default(''),
    freeText: z.string().max(20000).optional().default(''),
  })
  .refine((v) => Boolean(v.pastedResume?.trim() || v.freeText?.trim()), {
    message: 'Paste a résumé or add some notes',
    path: ['pastedResume'],
  })

export type CreatePersonaFormValues = z.infer<typeof CreatePersonaFormSchema>
