// frontend-next/src/app/app/profile/page.tsx
import type { Metadata } from 'next'
import { ProfileWorkspace } from '@/components/profile/profile-workspace'

export const metadata: Metadata = { title: 'Profile' }

export default function ProfilePage() {
  return (
    <div className="flex-1 overflow-y-auto px-6">
      <ProfileWorkspace />
    </div>
  )
}
