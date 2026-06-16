import type { Metadata } from 'next'
import { apiServer } from '@/lib/api-server'
import { CoverLetterEditorView } from '@/components/cover-letters/cover-letter-editor-view'
import { CoverLetterNotFound } from '@/components/cover-letters/cover-letter-not-found'
import type { CoverLetter } from '@/types/cover-letter'
import type { AiStatus } from '@/types/persona'

export const metadata: Metadata = { title: 'Cover letter' }

export default async function CoverLetterEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let letter: CoverLetter | null = null
  try {
    letter = await apiServer.get<CoverLetter>(`/api/cover-letters/${id}`)
  } catch {
    letter = null
  }
  // Rendered inline (not via notFound()) so the missing-letter state keeps the
  // authenticated app shell + sidebar, which the notFound() boundary drops.
  if (!letter) return <CoverLetterNotFound />

  let aiStatus: AiStatus | undefined
  try {
    aiStatus = await apiServer.get<AiStatus>('/api/ai/status')
  } catch {
    aiStatus = undefined
  }

  return <CoverLetterEditorView initialLetter={letter} aiStatus={aiStatus} />
}
