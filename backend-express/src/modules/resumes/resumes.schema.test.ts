import { describe, it, expect } from 'vitest'
import { GenerateResumeSchema, UpdateResumeSchema } from './resumes.schema.js'

describe('GenerateResumeSchema', () => {
  it('requires a personaId; jobId/instructions optional', () => {
    expect(GenerateResumeSchema.safeParse({ personaId: '11111111-1111-1111-1111-111111111111' }).success).toBe(true)
    expect(GenerateResumeSchema.safeParse({}).success).toBe(false)
    expect(GenerateResumeSchema.safeParse({ personaId: 'not-a-uuid' }).success).toBe(false)
  })
})
describe('UpdateResumeSchema', () => {
  it('accepts a content-only edit; rejects empty', () => {
    expect(UpdateResumeSchema.safeParse({ content: { basics: { name: 'A' } } }).success).toBe(true)
    expect(UpdateResumeSchema.safeParse({}).success).toBe(false)
  })
})
