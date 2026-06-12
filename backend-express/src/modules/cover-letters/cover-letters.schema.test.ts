import { describe, it, expect } from 'vitest'
import { GenerateCoverLetterSchema, UpdateCoverLetterSchema } from './cover-letters.schema.js'

const UUID = '11111111-1111-1111-1111-111111111111'
const ADHOC = { title: 'Staff Engineer', company: 'Acme' }
describe('GenerateCoverLetterSchema', () => {
  it('requires jobId + personaId; instructions optional', () => {
    expect(GenerateCoverLetterSchema.safeParse({ jobId: UUID, personaId: UUID }).success).toBe(true)
    expect(GenerateCoverLetterSchema.safeParse({ jobId: UUID }).success).toBe(false)
    expect(GenerateCoverLetterSchema.safeParse({ jobId: 'x', personaId: UUID }).success).toBe(false)
  })

  it('accepts an inline job instead of a jobId (with or without description)', () => {
    expect(GenerateCoverLetterSchema.safeParse({ personaId: UUID, job: ADHOC }).success).toBe(true)
    expect(
      GenerateCoverLetterSchema.safeParse({ personaId: UUID, job: { ...ADHOC, description: 'JD text' } }).success,
    ).toBe(true)
  })

  it('rejects both jobId and job, and neither', () => {
    expect(GenerateCoverLetterSchema.safeParse({ personaId: UUID, jobId: UUID, job: ADHOC }).success).toBe(false)
    expect(GenerateCoverLetterSchema.safeParse({ personaId: UUID }).success).toBe(false)
  })

  it('rejects an inline job with empty or whitespace title/company', () => {
    expect(GenerateCoverLetterSchema.safeParse({ personaId: UUID, job: { title: '', company: 'Acme' } }).success).toBe(
      false,
    )
    expect(
      GenerateCoverLetterSchema.safeParse({ personaId: UUID, job: { title: '   ', company: 'Acme' } }).success,
    ).toBe(false)
    expect(
      GenerateCoverLetterSchema.safeParse({ personaId: UUID, job: { title: 'Staff Engineer', company: '  ' } }).success,
    ).toBe(false)
  })

  it('bounds the inline description at 50_000 chars', () => {
    expect(
      GenerateCoverLetterSchema.safeParse({ personaId: UUID, job: { ...ADHOC, description: 'x'.repeat(50_000) } })
        .success,
    ).toBe(true)
    expect(
      GenerateCoverLetterSchema.safeParse({ personaId: UUID, job: { ...ADHOC, description: 'x'.repeat(50_001) } })
        .success,
    ).toBe(false)
  })

  it('trims whitespace around inline title/company in the parsed output', () => {
    const parsed = GenerateCoverLetterSchema.parse({
      personaId: UUID,
      job: { title: '  Staff Engineer  ', company: '  Acme  ' },
    })
    expect(parsed.job).toEqual({ title: 'Staff Engineer', company: 'Acme' })
  })
})
describe('UpdateCoverLetterSchema', () => {
  it('accepts a body edit; rejects empty', () => {
    expect(UpdateCoverLetterSchema.safeParse({ bodyMarkdown: 'Dear…' }).success).toBe(true)
    expect(UpdateCoverLetterSchema.safeParse({}).success).toBe(false)
  })
})
