import { describe, it, expect } from 'vitest'
import { getTableConfig } from 'drizzle-orm/pg-core'
import { userProfiles } from './user-profiles.js'

describe('user_profiles table', () => {
  it('has the expected columns', () => {
    const cols = getTableConfig(userProfiles).columns.map((c) => c.name)
    expect(cols).toEqual(expect.arrayContaining(['id', 'user_id', 'content', 'created_at', 'updated_at']))
  })

  it('user_id is unique (one profile per user)', () => {
    const userId = getTableConfig(userProfiles).columns.find((c) => c.name === 'user_id')
    expect(userId?.isUnique).toBe(true)
  })
})
