import type { Metadata } from 'next'
import { Suspense } from 'react'
import { PersonasWorkspace } from '@/components/personas/personas-workspace'
import { PersonasSkeleton } from '@/components/layout/app/route-skeletons'
import { Hydrate, prefetch, serverQueryClient } from '@/lib/query-hydration'
import { aiStatusQuery, personasQuery, profileQuery } from '@/lib/queries'
import type { Persona, AiStatus } from '@/types/persona'
import type { ProfileContent } from '@/types/profile'

export const metadata: Metadata = { title: 'Personas' }

export default async function PersonasPage() {
  // Prefetched in parallel — independent reads, so one round-trip instead of
  // three. The master profile feeds the persona pickers and the build-from-
  // profile seed. A failed read is left out of the payload and refetched on the
  // client, rather than pinning an empty fallback into the cache.
  const qc = serverQueryClient()
  await Promise.all([
    prefetch<Persona[]>(qc, personasQuery),
    prefetch<AiStatus>(qc, aiStatusQuery),
    prefetch<ProfileContent>(qc, profileQuery),
  ])

  // Skeleton (not null) fallback: on client navigation this boundary suspends
  // while the workspace mounts, so a null fallback flashed the content blank.
  return (
    <Hydrate client={qc}>
      <Suspense fallback={<PersonasSkeleton />}>
        <PersonasWorkspace />
      </Suspense>
    </Hydrate>
  )
}
