import type { Metadata } from 'next'
import { Suspense } from 'react'
import { CoverLettersIndex } from '@/components/cover-letters/cover-letters-index'
import { CoverLettersSkeleton } from '@/components/layout/app/route-skeletons'
import { Hydrate, prefetch, serverQueryClient } from '@/lib/query-hydration'
import { aiStatusQuery, coverLettersQuery, personasQuery } from '@/lib/queries'
import type { Persona, AiStatus } from '@/types/persona'
import type { CoverLetter } from '@/types/cover-letter'

export const metadata: Metadata = { title: 'Cover letters' }

export default async function CoverLettersPage() {
  // Prefetched in parallel — independent reads, so one round-trip instead of
  // three. A read that fails is left out of the dehydrated payload entirely
  // (never cached as an empty list), so the client hook fetches it on mount —
  // where api-client's silent token refresh can heal an expired access cookie.
  const qc = serverQueryClient()
  await Promise.all([
    prefetch<Persona[]>(qc, personasQuery),
    prefetch<CoverLetter[]>(qc, coverLettersQuery),
    prefetch<AiStatus>(qc, aiStatusQuery),
  ])

  // useSearchParams() in CoverLettersIndex (the URL-driven New sheet) requires a
  // Suspense boundary; the skeleton fallback covers client-nav remounts.
  return (
    <Hydrate client={qc}>
      <Suspense fallback={<CoverLettersSkeleton />}>
        <CoverLettersIndex />
      </Suspense>
    </Hydrate>
  )
}
