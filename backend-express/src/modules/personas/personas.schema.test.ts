import { describe, it, expect } from 'vitest'
import { CreatePersonaSchema, UpdatePersonaSchema } from './personas.schema.js'

describe('CreatePersonaSchema', () => {
  it('accepts a name + pasted resume', () => {
    expect(CreatePersonaSchema.safeParse({ name: 'Backend', inputs: { pastedResume: 'text' } }).success).toBe(true)
  })
  it('rejects empty inputs', () => {
    expect(CreatePersonaSchema.safeParse({ name: 'Backend', inputs: {} }).success).toBe(false)
  })
  it('rejects an empty name', () => {
    expect(CreatePersonaSchema.safeParse({ name: '', inputs: { freeText: 'x' } }).success).toBe(false)
  })
})

describe('UpdatePersonaSchema', () => {
  it('accepts a data-only edit', () => {
    expect(UpdatePersonaSchema.safeParse({ data: { basics: { name: 'A' } } }).success).toBe(true)
  })
  it('rejects an empty patch', () => {
    expect(UpdatePersonaSchema.safeParse({}).success).toBe(false)
  })
})
