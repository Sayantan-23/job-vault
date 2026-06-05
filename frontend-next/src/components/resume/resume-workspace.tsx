'use client'

import { useState } from 'react'
import type { Persona } from '@/types/persona'
import type { GeneratedResume, ResumeContent } from '@/types/resume'
import { useGenerateResume, useUpdateResume } from '@/hooks/use-resumes'
import { GenerateResumeBar } from './generate-resume-bar'
import { ResumePreview } from './resume-preview'
import { ResumeContentEditor } from './resume-content-editor'
import { ResumeOutputBar } from './resume-output-bar'
import { DownloadPdfButton } from './download-pdf-button'
import { Button } from '@/components/ui/button'

interface Props {
  personas: Persona[]
  initialPersonaId: string
}

export function ResumeWorkspace({ personas, initialPersonaId }: Props) {
  const [personaId, setPersonaId] = useState(initialPersonaId || personas[0]?.id || '')
  const [resume, setResume] = useState<GeneratedResume | null>(null)
  const [content, setContent] = useState<ResumeContent | null>(null)
  const generate = useGenerateResume()
  const save = useUpdateResume(resume?.id ?? '')

  const onGenerate = (instructions: string) => {
    generate.mutate(
      { personaId, ...(instructions.trim() ? { instructions: instructions.trim() } : {}) },
      {
        onSuccess: (r) => {
          setResume(r)
          setContent(r.content)
        },
      },
    )
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-6">
      <h1 className="font-serif text-2xl tracking-tight">Generate résumé</h1>
      <GenerateResumeBar personas={personas} personaId={personaId} onPersonaChange={setPersonaId} onGenerate={onGenerate} isPending={generate.isPending} />
      {generate.error ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">{generate.error.message}</p>
      ) : null}

      {resume && content ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <ResumeOutputBar resumeId={resume.id} />
              <DownloadPdfButton content={content} fileName={`${(resume.title ?? 'resume').replace(/\s+/g, '-')}.pdf`} />
              <Button type="button" size="sm" disabled={save.isPending} onClick={() => save.mutate({ content })}>
                {save.isPending ? 'Saving…' : 'Save edits'}
              </Button>
            </div>
            <ResumeContentEditor value={content} onChange={setContent} />
          </div>
          <ResumePreview content={content} />
        </div>
      ) : null}
    </div>
  )
}
