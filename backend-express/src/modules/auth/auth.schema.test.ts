import { describe, it, expect } from 'vitest'
import { RegisterSchema, LoginSchema, UpdateProfileSchema, toPublicUser } from './auth.schema.js'

describe('auth schemas', () => {
  it('accepts a valid registration', () => {
    const r = RegisterSchema.safeParse({ name: 'Ada', email: 'a@b.co', password: 'longenough' })
    expect(r.success).toBe(true)
  })
  it('rejects a short password', () => {
    const r = RegisterSchema.safeParse({ name: 'Ada', email: 'a@b.co', password: 'short' })
    expect(r.success).toBe(false)
  })
  it('rejects a bad email on login', () => {
    expect(LoginSchema.safeParse({ email: 'no', password: 'x' }).success).toBe(false)
  })
  it('allows an empty profile update', () => {
    expect(UpdateProfileSchema.safeParse({}).success).toBe(true)
  })
})

describe('toPublicUser', () => {
  it('strips secret fields', () => {
    const pub = toPublicUser({
      id: 'u1',
      name: 'Ada',
      email: 'a@b.co',
      passwordHash: 'secret',
      googleId: null,
      isEmailVerified: false,
      masterResumeUrl: null,
      masterProfileJson: null,
      preferences: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    expect(pub).not.toHaveProperty('passwordHash')
    expect(pub.email).toBe('a@b.co')
  })
})
