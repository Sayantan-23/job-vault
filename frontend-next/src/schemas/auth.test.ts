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
      RegisterSchema.safeParse({ name: 'Ada', email: 'a@b.c', password: 'short' }).success,
    ).toBe(false)
  })
})
