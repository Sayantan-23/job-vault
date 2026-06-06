'use client'

import { useState } from 'react'
import type { Persona } from '@/types/persona'
import type { GeneratedResume, ResumeContent } from '@/types/resume'
import { useGenerateResume, useUpdateResume } from '@/hooks/use-resumes'
import { useJobOptions } from '@/hooks/use-job-options'
import { GenerateResumeBar } from './generate-resume-bar'
import { ResumePreview } from './resume-preview'
import { ResumeContentEditor } from './resume-content-editor'
import { ResumeOutputBar } from './resume-output-bar'
import { DownloadPdfButton } from './download-pdf-button'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/app/page-header'

interface Props {
  personas: Persona[]
  initialPersonaId: string
  initialJobId?: string
}

export function ResumeWorkspace({ personas, initialPersonaId, initialJobId }: Props) {
  const [personaId, setPersonaId] = useState(initialPersonaId || personas[0]?.id || '')
  const [jobId, setJobId] = useState(initialJobId ?? '')
  const [resume, setResume] = useState<GeneratedResume | null>(null)
  const [content, setContent] = useState<ResumeContent | null>(null)
  const generate = useGenerateResume()
  const save = useUpdateResume(resume?.id ?? '')
  const { data: jobs = [] } = useJobOptions()

  const onGenerate = (instructions: string) => {
    generate.mutate(
      {
        personaId,
        ...(jobId ? { jobId } : {}),
        ...(instructions.trim() ? { instructions: instructions.trim() } : {}),
      },
      {
        onSuccess: (r) => {
          setResume(r)
          setContent(r.content)
        },
      },
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Generate résumé"
        description={jobId ? 'Tailored to a selected job' : 'From one of your personas'}
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          <div className="max-w-xl">
            <GenerateResumeBar
              personas={personas}
              personaId={personaId}
              onPersonaChange={setPersonaId}
              jobs={jobs}
              jobId={jobId}
              onJobChange={setJobId}
              onGenerate={onGenerate}
              isPending={generate.isPending}
            />
            {generate.error ? (
              <p role="alert" className="mt-3 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {generate.error.message}
              </p>
            ) : null}
          </div>

          {resume && content ? (
            <div className="grid gap-6 xl:grid-cols-2">
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
      </div>
    </div>
  )
}
