import type { Metadata } from 'next'
import { Suspense } from 'react'
import { apiServer } from '@/lib/api-server'
import { PersonasWorkspace } from '@/components/personas/personas-workspace'
import type { Persona, AiStatus } from '@/types/persona'
import type { ProfileContent } from '@/types/profile'

export const metadata: Metadata = { title: 'Personas' }

const EMPTY_PROFILE: ProfileContent = {
  basics: { name: '', email: '', phone: '', location: '', links: [] },
  summary: '',
  experience: [],
  projects: [],
  skills: [],
  education: [],
}

export default async function PersonasPage() {
  let initialPersonas: Persona[] = []
  try {
    initialPersonas = await apiServer.get<Persona[]>('/api/personas')
  } catch {
    initialPersonas = []
  }
  let initialStatus: AiStatus = { enabled: false, maxPersonas: 5 }
  try {
    initialStatus = await apiServer.get<AiStatus>('/api/ai/status')
  } catch {
    initialStatus = { enabled: false, maxPersonas: 5 }
  }
  // The master profile feeds the persona pickers and the build-from-profile seed.
  let initialProfile: ProfileContent = EMPTY_PROFILE
  try {
    initialProfile = await apiServer.get<ProfileContent>('/api/profile')
  } catch {
    initialProfile = EMPTY_PROFILE
  }

  return (
    <Suspense fallback={null}>
      <PersonasWorkspace
        initialPersonas={initialPersonas}
        initialStatus={initialStatus}
        initialProfile={initialProfile}
      />
    </Suspense>
  )
}
