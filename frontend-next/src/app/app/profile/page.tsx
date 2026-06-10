// frontend-next/src/app/app/profile/page.tsx
import type { Metadata } from 'next'
import { ProfileWorkspace } from '@/components/profile/profile-workspace'

export const metadata: Metadata = { title: 'Profile' }

export default function ProfilePage() {
  return <ProfileWorkspace />
}
