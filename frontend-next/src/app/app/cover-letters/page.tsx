import type { Metadata } from 'next'
import { apiServer } from '@/lib/api-server'
import { CoverLettersWorkspace } from '@/components/cover-letters/cover-letters-workspace'
import type { Persona, AiStatus } from '@/types/persona'
import type { CoverLetter } from '@/types/cover-letter'

export const metadata: Metadata = { title: 'Cover letters' }

export default async function CoverLettersPage() {
  let personas: Persona[] = []
  try {
    personas = await apiServer.get<Persona[]>('/api/personas')
  } catch {
    personas = []
  }
  let letters: CoverLetter[] = []
  try {
    letters = await apiServer.get<CoverLetter[]>('/api/cover-letters')
  } catch {
    letters = []
  }
  let aiStatus: AiStatus | undefined
  try {
    aiStatus = await apiServer.get<AiStatus>('/api/ai/status')
  } catch {
    aiStatus = undefined
  }

  return <CoverLettersWorkspace personas={personas} initialLetters={letters} aiStatus={aiStatus} />
}
