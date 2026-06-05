import type { Metadata } from 'next'
import { Suspense } from 'react'
import { apiServer } from '@/lib/api-server'
import { PersonasWorkspace } from '@/components/personas/personas-workspace'
import type { Persona, AiStatus } from '@/types/persona'

export const metadata: Metadata = { title: 'Personas' }

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

  return (
    <Suspense fallback={null}>
      <PersonasWorkspace initialPersonas={initialPersonas} initialStatus={initialStatus} />
    </Suspense>
  )
}
