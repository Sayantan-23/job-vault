import { describe, it, expect } from 'vitest'
import { CreatePersonaFormSchema } from './persona'

describe('CreatePersonaFormSchema', () => {
  it('requires a name and at least one input', () => {
    expect(CreatePersonaFormSchema.safeParse({ name: 'Backend', pastedResume: 'text', freeText: '' }).success).toBe(true)
    expect(CreatePersonaFormSchema.safeParse({ name: 'Backend', pastedResume: '', freeText: '' }).success).toBe(false)
    expect(CreatePersonaFormSchema.safeParse({ name: '', pastedResume: 'text', freeText: '' }).success).toBe(false)
  })
})
