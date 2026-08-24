// frontend-next/src/app/app/profile/page.tsx
import type { Metadata } from 'next'
import { ProfileWorkspace } from '@/components/profile/profile-workspace'
import { Hydrate, prefetch, serverQueryClient } from '@/lib/query-hydration'
import { profileQuery } from '@/lib/queries'
import type { ProfileContent } from '@/types/profile'

export const metadata: Metadata = { title: 'Profile' }

export default async function ProfilePage() {
  // Prefetch on the server (cookies forwarded) so the editor renders populated
  // on first paint — no client-side fetch flash.
  const qc = serverQueryClient()
  await prefetch<ProfileContent>(qc, profileQuery)
  return (
    <Hydrate client={qc}>
      <ProfileWorkspace />
    </Hydrate>
  )
}
