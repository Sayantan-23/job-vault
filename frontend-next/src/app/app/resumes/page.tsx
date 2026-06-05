import type { Metadata } from 'next'
import { Suspense } from 'react'
import { apiServer } from '@/lib/api-server'
import { ResumesPageClient } from '@/components/resume/resumes-page-client'
import type { Persona } from '@/types/persona'

export const metadata: Metadata = { title: 'Résumés' }

export default async function ResumesPage() {
  let personas: Persona[] = []
  try {
    personas = await apiServer.get<Persona[]>('/api/personas')
  } catch {
    personas = []
  }
  return (
    <Suspense fallback={null}>
      <ResumesPageClient personas={personas} />
    </Suspense>
  )
}
