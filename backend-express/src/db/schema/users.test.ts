import { describe, it, expect } from 'vitest'
import { getTableColumns } from 'drizzle-orm'
import { users } from './users.js'

describe('users table', () => {
  it('defines the expected columns', () => {
    const cols = Object.keys(getTableColumns(users)).sort()
    expect(cols).toEqual(
      [
        'createdAt',
        'email',
        'googleId',
        'id',
        'isEmailVerified',
        'masterProfileJson',
        'masterResumeUrl',
        'name',
        'passwordHash',
        'preferences',
        'refreshTokenHash',
        'updatedAt',
      ].sort(),
    )
  })

  it('makes email and id not null', () => {
    const cols = getTableColumns(users)
    expect(cols.id.notNull).toBe(true)
    expect(cols.email.notNull).toBe(true)
    expect(cols.passwordHash.notNull).toBe(false)
  })
})
