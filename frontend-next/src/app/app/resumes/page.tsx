import type { Metadata } from 'next'
import { Suspense } from 'react'
import { apiServer } from '@/lib/api-server'
import { ResumesPageClient } from '@/components/resume/resumes-page-client'
import type { Persona } from '@/types/persona'
import type { GeneratedResume } from '@/types/resume'

export const metadata: Metadata = { title: 'Résumés' }

export default async function ResumesPage() {
  let personas: Persona[] = []
  try {
    personas = await apiServer.get<Persona[]>('/api/personas')
  } catch {
    personas = []
  }
  let resumes: GeneratedResume[] = []
  try {
    resumes = await apiServer.get<GeneratedResume[]>('/api/resumes')
  } catch {
    resumes = []
  }
  return (
    <Suspense fallback={null}>
      <ResumesPageClient personas={personas} initialResumes={resumes} />
    </Suspense>
  )
}
