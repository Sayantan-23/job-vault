import { describe, it, expect } from 'vitest'
import { GenerateCoverLetterSchema, UpdateCoverLetterSchema } from './cover-letters.schema.js'

const UUID = '11111111-1111-1111-1111-111111111111'
describe('GenerateCoverLetterSchema', () => {
  it('requires jobId + personaId; instructions optional', () => {
    expect(GenerateCoverLetterSchema.safeParse({ jobId: UUID, personaId: UUID }).success).toBe(true)
    expect(GenerateCoverLetterSchema.safeParse({ jobId: UUID }).success).toBe(false)
    expect(GenerateCoverLetterSchema.safeParse({ jobId: 'x', personaId: UUID }).success).toBe(false)
  })
})
describe('UpdateCoverLetterSchema', () => {
  it('accepts a body edit; rejects empty', () => {
    expect(UpdateCoverLetterSchema.safeParse({ bodyMarkdown: 'Dear…' }).success).toBe(true)
    expect(UpdateCoverLetterSchema.safeParse({}).success).toBe(false)
  })
})
