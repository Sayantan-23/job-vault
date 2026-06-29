'use client'

import { useSearchParams } from 'next/navigation'
import type { Persona } from '@/types/persona'
import type { GeneratedResume } from '@/types/resume'
import { ResumeWorkspace } from './resume-workspace'

interface Props {
  // SSR-fetched; undefined means the server fetch failed and the workspace
  // hooks should fetch on mount instead (see /app/resumes/page.tsx).
  initialPersonas?: Persona[] | undefined
  initialResumes?: GeneratedResume[] | undefined
}

export function ResumesPageClient({ initialPersonas, initialResumes }: Props) {
  const sp = useSearchParams()
  const initial = sp.get('persona') ?? ''
  const job = sp.get('job') ?? ''
  // ?resume=<id> opens that résumé in the workspace (deep-linked from a JobDrawer
  // launcher row — résumés have no per-id route, so they open in the list).
  const resume = sp.get('resume') ?? ''
  return (
    <ResumeWorkspace
      initialPersonas={initialPersonas}
      initialPersonaId={initial}
      initialResumes={initialResumes}
      {...(job ? { initialJobId: job } : {})}
      {...(resume ? { initialResumeId: resume } : {})}
    />
  )
}
