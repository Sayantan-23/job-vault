import { describe, it, expect } from 'vitest'
import { CreatePersonaSchema, UpdatePersonaSchema } from './personas.schema.js'

const PROFILE = {
  basics: { name: 'Ada Lovelace', links: [] },
  summary: 'Engineer',
  experience: [
    { company: 'Acme', role: 'Backend Dev', startDate: { month: 1, year: 2022 }, endDate: null, current: true, bullets: ['Built **APIs**'] },
  ],
  projects: [],
  skills: [{ category: 'Languages', items: ['TypeScript'] }],
  education: [],
}

describe('CreatePersonaSchema', () => {
  it('accepts a name + ProfileContent data', () => {
    expect(CreatePersonaSchema.safeParse({ name: 'Backend', data: PROFILE }).success).toBe(true)
  })
  it('accepts an optional rawInput (string or null)', () => {
    expect(CreatePersonaSchema.safeParse({ name: 'Backend', data: PROFILE, rawInput: 'pasted résumé' }).success).toBe(true)
    expect(CreatePersonaSchema.safeParse({ name: 'Backend', data: PROFILE, rawInput: null }).success).toBe(true)
  })
  it('rejects missing data', () => {
    expect(CreatePersonaSchema.safeParse({ name: 'Backend' }).success).toBe(false)
  })
  it('rejects invalid data (missing basics name)', () => {
    expect(CreatePersonaSchema.safeParse({ name: 'Backend', data: { ...PROFILE, basics: { links: [] } } }).success).toBe(false)
  })
  it('rejects the legacy inputs shape', () => {
    expect(CreatePersonaSchema.safeParse({ name: 'Backend', inputs: { pastedResume: 'text' } }).success).toBe(false)
  })
  it('rejects an empty name', () => {
    expect(CreatePersonaSchema.safeParse({ name: '', data: PROFILE }).success).toBe(false)
  })
})

describe('UpdatePersonaSchema', () => {
  it('accepts a data-only edit with ProfileContent', () => {
    expect(UpdatePersonaSchema.safeParse({ data: PROFILE }).success).toBe(true)
  })
  it('accepts a name-only edit', () => {
    expect(UpdatePersonaSchema.safeParse({ name: 'Full-stack' }).success).toBe(true)
  })
  it('rejects an empty patch', () => {
    expect(UpdatePersonaSchema.safeParse({}).success).toBe(false)
  })
  it('rejects invalid ProfileContent data (experience without a role)', () => {
    const bad = { ...PROFILE, experience: [{ company: 'Acme', bullets: [] }] }
    expect(UpdatePersonaSchema.safeParse({ data: bad }).success).toBe(false)
  })
})
