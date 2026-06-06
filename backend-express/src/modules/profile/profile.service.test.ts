import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./profile.repository.js', () => ({
  profileRepository: { findByUserId: vi.fn(), upsert: vi.fn() },
}))

import { profileRepository } from './profile.repository.js'
import { profileService } from './profile.service.js'
import { ProfileContentSchema, type ProfileContent } from '@/shared/profile-content.schema.js'
import type { UserProfileRow } from '@/db/schema/user-profiles.js'

const repo = vi.mocked(profileRepository)
const CONTENT: ProfileContent = ProfileContentSchema.parse({ basics: { name: 'Ada' }, summary: 'hi' })
function row(content: ProfileContent): UserProfileRow {
  return { id: 'pr1', userId: 'u1', content, createdAt: new Date(), updatedAt: new Date() }
}

beforeEach(() => vi.clearAllMocks())

describe('profileService.getForUser', () => {
  it('returns the saved content when a row exists', async () => {
    repo.findByUserId.mockResolvedValue(row(CONTENT))
    expect(await profileService.getForUser('u1')).toEqual(CONTENT)
  })
  it('returns an empty profile (not persisted) when none exists', async () => {
    repo.findByUserId.mockResolvedValue(null)
    const out = await profileService.getForUser('u1')
    expect(out.basics.name).toBe('')
    expect(repo.upsert).not.toHaveBeenCalled()
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
