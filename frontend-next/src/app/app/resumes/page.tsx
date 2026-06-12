import type { Metadata } from 'next'
import { Suspense } from 'react'
import { apiServer } from '@/lib/api-server'
import { ResumesPageClient } from '@/components/resume/resumes-page-client'
import type { Persona } from '@/types/persona'
import type { GeneratedResume } from '@/types/resume'

export const metadata: Metadata = { title: 'Résumés' }

// Failed server fetches fall back to undefined (never []) — the client hooks
// treat undefined as "no SSR data" and fetch on mount, where the api-client's
// silent token refresh heals e.g. an expired access cookie. A [] fallback
// would be installed as fresh initialData and pin a false-empty workspace.
export default async function ResumesPage() {
  let personas: Persona[] | undefined
  try {
    personas = await apiServer.get<Persona[]>('/api/personas')
  } catch {
    personas = undefined
  }
  let resumes: GeneratedResume[] | undefined
  try {
    resumes = await apiServer.get<GeneratedResume[]>('/api/resumes')
  } catch {
    resumes = undefined
  }
  return (
    <Suspense fallback={null}>
      <ResumesPageClient initialPersonas={personas} initialResumes={resumes} />
    </Suspense>
  )
}
