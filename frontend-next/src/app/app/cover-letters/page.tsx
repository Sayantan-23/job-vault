import type { Metadata } from 'next'
import { apiServer } from '@/lib/api-server'
import { CoverLettersIndex } from '@/components/cover-letters/cover-letters-index'
import type { Persona, AiStatus } from '@/types/persona'
import type { CoverLetter } from '@/types/cover-letter'

export const metadata: Metadata = { title: 'Cover letters' }

// Failed server fetches fall back to undefined (never []) — the client hooks
// treat undefined as "no SSR data" and fetch on mount, where the api-client's
// silent token refresh heals e.g. an expired access cookie. A [] fallback
// would be installed as fresh initialData and pin a false-empty workspace.
export default async function CoverLettersPage() {
  let personas: Persona[] | undefined
  try {
    personas = await apiServer.get<Persona[]>('/api/personas')
  } catch {
    personas = undefined
  }
  let letters: CoverLetter[] | undefined
  try {
    letters = await apiServer.get<CoverLetter[]>('/api/cover-letters')
  } catch {
    letters = undefined
  }
  let aiStatus: AiStatus | undefined
  try {
    aiStatus = await apiServer.get<AiStatus>('/api/ai/status')
  } catch {
    aiStatus = undefined
  }

  return <CoverLettersIndex initialPersonas={personas} initialLetters={letters} aiStatus={aiStatus} />
}
