'use client'

import { useSearchParams } from 'next/navigation'
import { ResumeWorkspace } from './resume-workspace'

export function ResumesPageClient() {
  const sp = useSearchParams()
  const initial = sp.get('persona') ?? ''
  const job = sp.get('job') ?? ''
  // ?resume=<id> opens that résumé in the workspace (deep-linked from a JobDrawer
  // launcher row — résumés have no per-id route, so they open in the list).
  const resume = sp.get('resume') ?? ''
  return (
    <ResumeWorkspace
      initialPersonaId={initial}
      {...(job ? { initialJobId: job } : {})}
      {...(resume ? { initialResumeId: resume } : {})}
    />
  )
}
