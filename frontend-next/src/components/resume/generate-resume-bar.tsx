'use client'

import { useState } from 'react'
import type { Persona } from '@/types/persona'
import type { JobOption } from '@/hooks/use-job-options'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface Props {
  personas: Persona[]
  personaId: string
  onPersonaChange: (id: string) => void
  jobs: JobOption[]
  jobId: string
  onJobChange: (id: string) => void
  onGenerate: (instructions: string) => void
  isPending: boolean
}

export function GenerateResumeBar({
  personas,
  personaId,
  onPersonaChange,
  jobs,
  jobId,
  onJobChange,
  onGenerate,
  isPending,
}: Props) {
  const [instructions, setInstructions] = useState('')
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1.5 sm:w-52">
          <Label htmlFor="gr-persona">Persona</Label>
          <Select id="gr-persona" value={personaId} onChange={(e) => onPersonaChange(e.target.value)}>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5 sm:w-64">
          <Label htmlFor="gr-job">Tailor to a job (optional)</Label>
          <Select id="gr-job" value={jobId} onChange={(e) => onJobChange(e.target.value)}>
            <option value="">No job — general résumé</option>
            {jobs.map((j) => (
              <option key={j.id} value={j.id}>
                {j.title} — {j.company}
              </option>
            ))}
          </Select>
        </div>
        <div className="hidden flex-1 sm:block" />
        <Button type="button" disabled={isPending || !personaId} onClick={() => onGenerate(instructions)}>
          {isPending ? 'Generating…' : 'Generate résumé'}
        </Button>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="gr-instructions">Instructions (optional)</Label>
        <Textarea
          id="gr-instructions"
          rows={2}
          placeholder="e.g. emphasize leadership; keep to one page"
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </div>
    </div>
  )
}
