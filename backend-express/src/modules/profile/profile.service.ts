import { ensureIds, emptyProfileContent, type ProfileContent } from '@/shared/profile-content.schema.js'
import { authRepository } from '@/modules/auth/auth.repository.js'
import { profileRepository } from './profile.repository.js'

async function getForUser(userId: string): Promise<ProfileContent> {
  const row = await profileRepository.findByUserId(userId)
  if (row) return row.content
  // No saved profile yet: seed an unpersisted default with the name + email
  // captured at registration, so the user isn't re-typing what we already have.
  const user = await authRepository.findById(userId)
  const empty = emptyProfileContent()
  if (user) {
    empty.basics.name = user.name
    empty.basics.email = user.email
  }
  return empty
}

async function update(userId: string, content: ProfileContent): Promise<ProfileContent> {
  const row = await profileRepository.upsert(userId, ensureIds(content))
  return row.content
}

export const profileService = { getForUser, update }
