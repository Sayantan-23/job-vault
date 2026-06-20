import { describe, it, expect } from 'vitest'
import { CreateApiKeySchema } from './api-keys.schema.js'

describe('CreateApiKeySchema', () => {
  it('accepts a valid name and trims surrounding whitespace', () => {
    expect(CreateApiKeySchema.parse({ name: '  Chrome  ' })).toEqual({ name: 'Chrome' })
  })
  it('rejects an empty or whitespace-only name', () => {
    expect(CreateApiKeySchema.safeParse({ name: '' }).success).toBe(false)
    expect(CreateApiKeySchema.safeParse({ name: '   ' }).success).toBe(false)
  })
  it('rejects a name over 100 chars', () => {
    expect(CreateApiKeySchema.safeParse({ name: 'a'.repeat(101) }).success).toBe(false)
  })
})
