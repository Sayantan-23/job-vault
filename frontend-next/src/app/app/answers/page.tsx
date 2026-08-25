import type { Metadata } from 'next'
import { Suspense } from 'react'
import { AnswersIndex } from '@/components/answers/answers-index'
import { AnswersSkeleton } from '@/components/layout/app/route-skeletons'
import { Hydrate, prefetch, serverQueryClient } from '@/lib/query-hydration'
import { aiStatusQuery, answersQuery, personasQuery } from '@/lib/queries'
import type { Answer } from '@/types/answer'
import type { Persona, AiStatus } from '@/types/persona'

export const metadata: Metadata = { title: 'Answers' }

export default async function AnswersPage() {
  // Prefetched in parallel — independent reads. A read that fails is left out
  // of the dehydrated payload entirely (never cached as an empty list), so the
  // client hook fetches it on mount, where api-client's silent token refresh
  // can heal an expired access cookie.
  const qc = serverQueryClient()
  await Promise.all([
    prefetch<Answer[]>(qc, answersQuery),
    prefetch<Persona[]>(qc, personasQuery),
    prefetch<AiStatus>(qc, aiStatusQuery),
  ])

  // useSearchParams() in AnswersIndex requires a Suspense boundary.
  return (
    <Hydrate client={qc}>
      <Suspense fallback={<AnswersSkeleton />}>
        <AnswersIndex />
      </Suspense>
    </Hydrate>
  )
}
