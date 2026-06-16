import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { apiServer } from '@/lib/api-server'
import { CoverLetterEditorView } from '@/components/cover-letters/cover-letter-editor-view'
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
  if (!letter) notFound()

  let aiStatus: AiStatus | undefined
  try {
    aiStatus = await apiServer.get<AiStatus>('/api/ai/status')
  } catch {
    aiStatus = undefined
  }

  return <CoverLetterEditorView initialLetter={letter} aiStatus={aiStatus} />
}
