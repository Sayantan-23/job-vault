import { describe, it, expect } from 'vitest'
import { LoginSchema, RegisterSchema } from './auth'

describe('auth schemas', () => {
  it('accepts valid login input', () => {
    expect(LoginSchema.safeParse({ email: 'a@b.co', password: 'x' }).success).toBe(true)
  })
  it('rejects an invalid email', () => {
    expect(LoginSchema.safeParse({ email: 'no', password: 'x' }).success).toBe(false)
  })
  it('rejects a short registration password', () => {
    expect(
      RegisterSchema.safeParse({ name: 'Ada', email: 'a@b.co', password: 'short' }).success,
    ).toBe(false)
  })
  it('accepts a password at the 72-char max and rejects one over it', () => {
    expect(
      RegisterSchema.safeParse({ name: 'Ada', email: 'a@b.co', password: 'x'.repeat(72) }).success,
    ).toBe(true)
    expect(
      RegisterSchema.safeParse({ name: 'Ada', email: 'a@b.co', password: 'x'.repeat(73) }).success,
    ).toBe(false)
  })
  it('rejects an empty name and a name over 100 chars', () => {
    expect(
      RegisterSchema.safeParse({ name: '', email: 'a@b.co', password: 'longenough' }).success,
    ).toBe(false)
    expect(
      RegisterSchema.safeParse({ name: 'x'.repeat(101), email: 'a@b.co', password: 'longenough' })
        .success,
    ).toBe(false)
  })
})
