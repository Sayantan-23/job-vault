import type { Metadata } from 'next'
import { Suspense } from 'react'
import { ResumesPageClient } from '@/components/resume/resumes-page-client'
import { ResumesSkeleton } from '@/components/layout/app/route-skeletons'
import { Hydrate, prefetch, serverQueryClient } from '@/lib/query-hydration'
import { personasQuery, resumesQuery } from '@/lib/queries'
import type { Persona } from '@/types/persona'
import type { GeneratedResume } from '@/types/resume'

export const metadata: Metadata = { title: 'Résumés' }

export default async function ResumesPage() {
  // Prefetched in parallel — independent reads, so one round-trip instead of
  // two. A read that fails is left out of the dehydrated payload entirely
  // (never cached as an empty list), so the client hook fetches it on mount —
  // where api-client's silent token refresh can heal an expired access cookie.
  const qc = serverQueryClient()
  await Promise.all([
    prefetch<Persona[]>(qc, personasQuery),
    prefetch<GeneratedResume[]>(qc, resumesQuery()),
  ])
  // Skeleton (not null) fallback: on client navigation this boundary suspends
  // while the workspace mounts, so a null fallback flashed the content blank.
  return (
    <Hydrate client={qc}>
      <Suspense fallback={<ResumesSkeleton />}>
        <ResumesPageClient />
      </Suspense>
    </Hydrate>
  )
}
