import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./profile.repository.js', () => ({
  profileRepository: { findByUserId: vi.fn(), upsert: vi.fn() },
}))
vi.mock('@/modules/auth/auth.repository.js', () => ({
  authRepository: { findById: vi.fn() },
}))

import { profileRepository } from './profile.repository.js'
import { authRepository } from '@/modules/auth/auth.repository.js'
import { profileService } from './profile.service.js'
import { ProfileContentSchema, type ProfileContent } from '@/shared/profile-content.schema.js'
import type { UserProfileRow } from '@/db/schema/user-profiles.js'
import type { UserRow } from '@/db/schema/users.js'

const repo = vi.mocked(profileRepository)
const auth = vi.mocked(authRepository)
const CONTENT: ProfileContent = ProfileContentSchema.parse({ basics: { name: 'Ada' }, summary: 'hi' })
function row(content: ProfileContent): UserProfileRow {
  return { id: 'pr1', userId: 'u1', content, createdAt: new Date(), updatedAt: new Date() }
}

function userRow(name: string, email: string): UserRow {
  return {
    id: 'u1',
    createdAt: new Date(),
    updatedAt: new Date(),
    name,
    email,
    passwordHash: null,
    googleId: null,
    isEmailVerified: false,
    masterResumeUrl: null,
    masterProfileJson: null,
    preferences: null,
    refreshTokenHash: null,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('profileService.getForUser', () => {
  it('returns the saved content when a row exists', async () => {
    repo.findByUserId.mockResolvedValue(row(CONTENT))
    expect(await profileService.getForUser('u1')).toEqual(CONTENT)
  })
  it('seeds an empty profile (not persisted) with the registered name/email when none exists', async () => {
    repo.findByUserId.mockResolvedValue(null)
    auth.findById.mockResolvedValue(userRow('Ada Lovelace', 'ada@example.com'))
    const out = await profileService.getForUser('u1')
    expect(out.basics.name).toBe('Ada Lovelace')
    expect(out.basics.email).toBe('ada@example.com')
    expect(repo.upsert).not.toHaveBeenCalled()
  })
  it('falls back to a blank profile when the user record is missing', async () => {
    repo.findByUserId.mockResolvedValue(null)
    auth.findById.mockResolvedValue(null)
    const out = await profileService.getForUser('u1')
    expect(out.basics.name).toBe('')
  })
})

describe('profileService.getSavedBasics', () => {
  it('returns the saved basics when a row exists with a non-blank name', async () => {
    repo.findByUserId.mockResolvedValue(row(CONTENT))
    expect(await profileService.getSavedBasics('u1')).toEqual(CONTENT.basics)
  })
  it('returns null when the saved name is blank', async () => {
    const blank: ProfileContent = { ...CONTENT, basics: { ...CONTENT.basics, name: '   ' } }
    repo.findByUserId.mockResolvedValue(row(blank))
    expect(await profileService.getSavedBasics('u1')).toBeNull()
  })
  it('returns null when no row exists (no registered-user seeding)', async () => {
    repo.findByUserId.mockResolvedValue(null)
    expect(await profileService.getSavedBasics('u1')).toBeNull()
    expect(auth.findById).not.toHaveBeenCalled()
  })
})

describe('profileService.update', () => {
  it('assigns ids then upserts, returning the stored content', async () => {
    const incoming = ProfileContentSchema.parse({
      basics: { name: 'Ada', links: [{ label: 'GH', url: 'gh' }] },
      experience: [{ company: 'X', role: 'SWE' }],
    })
    repo.upsert.mockImplementation(async (_uid, content) => row(content))
    const out = await profileService.update('u1', incoming)
    const upserted = repo.upsert.mock.calls[0]?.[1] as ProfileContent
    expect(upserted.basics.links[0]?.id).toBeTruthy() // ensureIds ran
    expect(upserted.experience[0]?.id).toBeTruthy()
    expect(out.experience[0]?.id).toBeTruthy()
  })
})
