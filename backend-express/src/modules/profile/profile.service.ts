import { ensureIds, emptyProfileContent, type ProfileContent } from '@/shared/profile-content.schema.js'
import { profileRepository } from './profile.repository.js'

async function getForUser(userId: string): Promise<ProfileContent> {
  const row = await profileRepository.findByUserId(userId)
  return row ? row.content : emptyProfileContent()
}

async function update(userId: string, content: ProfileContent): Promise<ProfileContent> {
  const row = await profileRepository.upsert(userId, ensureIds(content))
  return row.content
}

export const profileService = { getForUser, update }
