'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { AiDraftNote } from './ai-draft-note'

interface Props {
  personas: { id: string; name: string }[]
  question: string
  onGenerate: (input: { personaId: string; instructions?: string }) => void
  isGenerating: boolean
}

export function GenerateAnswerControls({ personas, question, onGenerate, isGenerating }: Props) {
  const [personaId, setPersonaId] = useState(personas[0]?.id ?? '')
  const [instructions, setInstructions] = useState('')

  const canGenerate = question.trim().length > 0 && personaId !== '' && !isGenerating

  const submit = () => {
    const trimmed = instructions.trim()
    onGenerate({ personaId, ...(trimmed ? { instructions: trimmed } : {}) })
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-40 space-y-1.5">
          <Label htmlFor="answer-persona">Persona</Label>
          <Select id="answer-persona" value={personaId} onChange={(e) => setPersonaId(e.target.value)}>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="min-w-52 flex-1 space-y-1.5">
          <Label htmlFor="answer-instructions">Extra instructions</Label>
          <Input
            id="answer-instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Optional — e.g. keep it plain, mention the migration"
          />
        </div>
        <Button type="button" onClick={submit} disabled={!canGenerate}>
          <Sparkles className="size-4" aria-hidden="true" />
          {isGenerating ? 'Generating…' : 'Generate'}
        </Button>
      </div>
      <AiDraftNote placement="control" />
    </div>
  )
}
