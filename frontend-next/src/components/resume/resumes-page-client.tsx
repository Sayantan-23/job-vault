'use client'

import { useSearchParams } from 'next/navigation'
import type { Persona } from '@/types/persona'
import type { GeneratedResume } from '@/types/resume'
import { ResumeWorkspace } from './resume-workspace'

interface Props {
  personas: Persona[]
  initialResumes: GeneratedResume[]
}

export function ResumesPageClient({ personas, initialResumes }: Props) {
  const sp = useSearchParams()
  const initial = sp.get('persona') ?? ''
  const job = sp.get('job') ?? ''
  return (
    <ResumeWorkspace
      personas={personas}
      initialPersonaId={initial}
      initialResumes={initialResumes}
      {...(job ? { initialJobId: job } : {})}
    />
  )
}
