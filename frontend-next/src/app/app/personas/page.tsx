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

const EMPTY_STATUS: AiStatus = { enabled: false, maxPersonas: 5 }

export default async function PersonasPage() {
  // Fetched in parallel — independent reads, so one round-trip instead of three.
  // The master profile feeds the persona pickers and the build-from-profile seed.
  const [initialPersonas, initialStatus, initialProfile] = await Promise.all([
    apiServer.get<Persona[]>('/api/personas').catch((): Persona[] => []),
    apiServer.get<AiStatus>('/api/ai/status').catch(() => EMPTY_STATUS),
    apiServer.get<ProfileContent>('/api/profile').catch(() => EMPTY_PROFILE),
  ])

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
