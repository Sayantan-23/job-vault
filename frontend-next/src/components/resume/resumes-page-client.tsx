'use client'

import { useSearchParams } from 'next/navigation'
import type { Persona } from '@/types/persona'
import { ResumeWorkspace } from './resume-workspace'

export function ResumesPageClient({ personas }: { personas: Persona[] }) {
  const sp = useSearchParams()
  const initial = sp.get('persona') ?? ''
  const job = sp.get('job') ?? ''
  if (personas.length === 0) {
    return <p className="mx-auto max-w-3xl p-6 text-sm text-muted-foreground">Create a persona first, then come back to generate a résumé.</p>
  }
  return <ResumeWorkspace personas={personas} initialPersonaId={initial} {...(job ? { initialJobId: job } : {})} />
}
