import type { Metadata } from 'next'
import { Suspense } from 'react'
import { apiServer } from '@/lib/api-server'
import { CoverLettersIndex } from '@/components/cover-letters/cover-letters-index'
import { CoverLettersSkeleton } from '@/components/layout/app/route-skeletons'
import type { Persona, AiStatus } from '@/types/persona'
import type { CoverLetter } from '@/types/cover-letter'

export const metadata: Metadata = { title: 'Cover letters' }

// Failed server fetches fall back to undefined (never []) — the client hooks
// treat undefined as "no SSR data" and fetch on mount, where the api-client's
// silent token refresh heals e.g. an expired access cookie. A [] fallback
// would be installed as fresh initialData and pin a false-empty workspace.
export default async function CoverLettersPage() {
  // Fetched in parallel — independent reads, so one round-trip instead of three.
  const [personas, letters, aiStatus] = await Promise.all([
    apiServer.get<Persona[]>('/api/personas').catch(() => undefined),
    apiServer.get<CoverLetter[]>('/api/cover-letters').catch(() => undefined),
    apiServer.get<AiStatus>('/api/ai/status').catch(() => undefined),
  ])

  // useSearchParams() in CoverLettersIndex (the URL-driven New sheet) requires a
  // Suspense boundary; the skeleton fallback covers client-nav remounts.
  return (
    <Suspense fallback={<CoverLettersSkeleton />}>
      <CoverLettersIndex initialPersonas={personas} initialLetters={letters} aiStatus={aiStatus} />
    </Suspense>
  )
}
