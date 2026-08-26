import type { Metadata } from 'next'
import { ApiError } from '@/lib/api-client'
import { apiServer } from '@/lib/api-server'
import { CoverLetterEditorView } from '@/components/cover-letters/cover-letter-editor-view'
import { CoverLetterNotFound } from '@/components/cover-letters/cover-letter-not-found'
import { Hydrate, prefetch, serverQueryClient } from '@/lib/query-hydration'
import { aiStatusQuery, coverLetterQuery } from '@/lib/queries'
import type { CoverLetter } from '@/types/cover-letter'
import type { AiStatus } from '@/types/persona'

export const metadata: Metadata = { title: 'Cover letter' }

export default async function CoverLetterEditorPage({
  params,
}: PageProps<'/app/cover-letters/[id]'>) {
  const { id } = await params
  const letter = coverLetterQuery(id)

  // fetchQuery (not prefetch) because this page has to *decide* on the result:
  // only a real 404 renders the not-found state. Any other failure — a network
  // blip, an expired access cookie — falls through to the editor, whose client
  // fetch retries with the silent token refresh instead of claiming the letter
  // is gone. aiStatus is prefetched alongside; it's simply unused on a 404.
  const qc = serverQueryClient()
  let missing = false
  await Promise.all([
    qc
      .fetchQuery({ queryKey: letter.key, queryFn: () => apiServer.get<CoverLetter>(letter.path) })
      .catch((e: unknown) => {
        missing = e instanceof ApiError && e.statusCode === 404
      }),
    prefetch<AiStatus>(qc, aiStatusQuery),
  ])
  // Rendered inline (not via notFound()) so the missing-letter state keeps the
  // authenticated app shell + sidebar, which the notFound() boundary drops.
  if (missing) return <CoverLetterNotFound />

  return (
    <Hydrate client={qc}>
      <CoverLetterEditorView id={id} />
    </Hydrate>
  )
}
