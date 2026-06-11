// frontend-next/src/app/app/profile/page.tsx
import type { Metadata } from 'next'
import { apiServer } from '@/lib/api-server'
import { ProfileWorkspace } from '@/components/profile/profile-workspace'
import { emptyProfileContent } from '@/lib/profile'
import type { ProfileContent } from '@/types/profile'

export const metadata: Metadata = { title: 'Profile' }

export default async function ProfilePage() {
  // Fetch on the server (cookies forwarded) so the editor renders populated on
  // first paint — no client-side fetch flash.
  let initialProfile: ProfileContent
  try {
    initialProfile = await apiServer.get<ProfileContent>('/api/profile')
  } catch {
    initialProfile = emptyProfileContent()
  }
  return <ProfileWorkspace initialProfile={initialProfile} />
}
