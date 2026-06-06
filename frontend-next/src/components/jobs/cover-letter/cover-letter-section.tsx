'use client'

import { useEffect, useState } from 'react'
import type { CoverLetter } from '@/types/cover-letter'
import { Select } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { usePersonas } from '@/hooks/use-personas'
import { useAiStatus } from '@/hooks/use-ai-status'
import { useCoverLetters, useGenerateCoverLetter, useUpdateCoverLetter } from '@/hooks/use-cover-letters'
import { CoverLetterEditor } from '@/components/resume/cover-letter-editor'

export function CoverLetterSection({ jobId }: { jobId: string }) {
  const { data: status } = useAiStatus()
  const { data: personas = [] } = usePersonas()
  const { data: existing = [] } = useCoverLetters(jobId)
  const generate = useGenerateCoverLetter()

  const [personaId, setPersonaId] = useState('')
  const [instructions, setInstructions] = useState('')
  const [active, setActive] = useState<CoverLetter | null>(null)
  const [body, setBody] = useState('')
  const save = useUpdateCoverLetter(active?.id ?? '')

  useEffect(() => {
    if (!personaId && personas[0]) setPersonaId(personas[0].id)
  }, [personas, personaId])
  useEffect(() => {
    if (!active && existing[0]) {
      setActive(existing[0])
      setBody(existing[0].bodyMarkdown)
    }
  }, [existing, active])

  const aiEnabled = status?.enabled ?? false

  const onGenerate = () => {
    generate.mutate(
      { jobId, personaId, ...(instructions.trim() ? { instructions: instructions.trim() } : {}) },
      { onSuccess: (cl) => { setActive(cl); setBody(cl.bodyMarkdown) } },
    )
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-medium">Cover letter</h3>
      {!aiEnabled ? (
        <p role="status" className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          AI features are not configured.
        </p>
      ) : (
        <>
          <div className="space-y-1.5">
            <Label htmlFor="cl-persona">Persona</Label>
            <Select id="cl-persona" value={personaId} onChange={(e) => setPersonaId(e.target.value)}>
              {personas.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </Select>
          </div>
          <Textarea rows={2} placeholder="Instructions (optional)" value={instructions} onChange={(e) => setInstructions(e.target.value)} aria-label="Cover letter instructions" />
          <Button type="button" disabled={generate.isPending || !personaId} onClick={onGenerate}>
            {generate.isPending ? 'Generating…' : 'Generate cover letter'}
          </Button>
          {generate.error ? (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{generate.error.message}</p>
          ) : null}

          {active ? (
            <div className="space-y-2 border-t border-border pt-3">
              <CoverLetterEditor value={body} onChange={setBody} fileName={`${(active.title ?? 'cover-letter').replace(/\s+/g, '-')}.pdf`} />
              <Button type="button" size="sm" disabled={save.isPending} onClick={() => save.mutate({ bodyMarkdown: body })}>
                {save.isPending ? 'Saving…' : 'Save edits'}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
