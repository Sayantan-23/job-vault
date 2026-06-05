'use client'

import { useState } from 'react'
import type { Persona } from '@/types/persona'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface Props {
  personas: Persona[]
  personaId: string
  onPersonaChange: (id: string) => void
  onGenerate: (instructions: string) => void
  isPending: boolean
}

export function GenerateResumeBar({ personas, personaId, onPersonaChange, onGenerate, isPending }: Props) {
  const [instructions, setInstructions] = useState('')
  return (
    <div className="space-y-3 rounded-lg border border-border p-4">
      <div className="space-y-1.5">
        <Label htmlFor="gr-persona">Persona</Label>
        <Select id="gr-persona" value={personaId} onChange={(e) => onPersonaChange(e.target.value)}>
          {personas.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="gr-instructions">Instructions (optional)</Label>
        <Textarea id="gr-instructions" rows={2} placeholder="e.g. emphasize leadership; keep to one page" value={instructions} onChange={(e) => setInstructions(e.target.value)} />
      </div>
      <Button type="button" disabled={isPending || !personaId} onClick={() => onGenerate(instructions)}>
        {isPending ? 'Generating…' : 'Generate résumé'}
      </Button>
    </div>
  )
}
