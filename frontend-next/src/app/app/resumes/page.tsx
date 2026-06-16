import type { Metadata } from 'next'
import { Suspense } from 'react'
import { apiServer } from '@/lib/api-server'
import { ResumesPageClient } from '@/components/resume/resumes-page-client'
import { ResumesSkeleton } from '@/components/layout/app/route-skeletons'
import type { Persona } from '@/types/persona'
import type { GeneratedResume } from '@/types/resume'

export const metadata: Metadata = { title: 'Résumés' }

// Failed server fetches fall back to undefined (never []) — the client hooks
// treat undefined as "no SSR data" and fetch on mount, where the api-client's
// silent token refresh heals e.g. an expired access cookie. A [] fallback
// would be installed as fresh initialData and pin a false-empty workspace.
export default async function ResumesPage() {
  // Fetched in parallel — independent reads, so one round-trip instead of two.
  const [personas, resumes] = await Promise.all([
    apiServer.get<Persona[]>('/api/personas').catch(() => undefined),
    apiServer.get<GeneratedResume[]>('/api/resumes').catch(() => undefined),
  ])
  // Skeleton (not null) fallback: on client navigation this boundary suspends
  // while the workspace mounts, so a null fallback flashed the content blank.
  return (
    <Suspense fallback={<ResumesSkeleton />}>
      <ResumesPageClient initialPersonas={personas} initialResumes={resumes} />
    </Suspense>
  )
}
