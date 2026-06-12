'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import type { Persona } from '@/types/persona'
import type { GeneratedResume, ResumeContent } from '@/types/resume'
import { useGenerateResume, useUpdateResume, useResumes, useDeleteResume } from '@/hooks/use-resumes'
import { useJobOptions, type JobOption } from '@/hooks/use-job-options'
import { GenerateResumeBar } from './generate-resume-bar'
import { ResumePreview } from './resume-preview'
import { ResumeContentEditor } from './resume-content-editor'
import { ResumeOutputBar } from './resume-output-bar'
import { DownloadPdfButton } from './download-pdf-button'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/app/page-header'
import { DocumentList, type DocumentRow } from '@/components/documents/document-list'

interface Props {
  personas: Persona[]
  initialPersonaId: string
  initialJobId?: string
  initialResumes: GeneratedResume[]
}

function NoPersonasHint() {
  return (
    <p role="status" className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
      <Link href="/app/personas" className="underline underline-offset-2 hover:text-foreground">
        Create a persona
      </Link>{' '}
      first, then come back to generate a résumé.
    </p>
  )
}

// Tracked generations join their job client-side (the same list the picker
// fetches); jobless ones read 'General'.
function resumeContext(r: GeneratedResume, jobsById: Map<string, JobOption>): string {
  const job = r.jobId ? jobsById.get(r.jobId) : undefined
  return job ? `${job.company} · ${job.title}` : 'General'
}

export function ResumeWorkspace({ personas, initialPersonaId, initialJobId, initialResumes }: Props) {
  const [personaId, setPersonaId] = useState(initialPersonaId || personas[0]?.id || '')
  const [jobId, setJobId] = useState(initialJobId ?? '')
  const [resume, setResume] = useState<GeneratedResume | null>(null)
  const [content, setContent] = useState<ResumeContent | null>(null)
  const generate = useGenerateResume()
  const save = useUpdateResume(resume?.id ?? '')
  const del = useDeleteResume()
  const { data: jobs = [] } = useJobOptions()
  const { data: allResumes = [] } = useResumes(undefined, initialResumes)

  const jobsById = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs])
  const personaNames = useMemo(() => new Map(personas.map((p) => [p.id, p.name])), [personas])

  const rows: DocumentRow[] = allResumes.map((r) => ({
    id: r.id,
    title: r.title ?? 'Untitled',
    context: resumeContext(r, jobsById),
    personaName: personaNames.get(r.personaId) ?? '—',
    createdAt: r.createdAt,
  }))

  const onSelect = (id: string) => {
    const selected = allResumes.find((r) => r.id === id)
    if (selected) {
      setResume(selected)
      setContent(selected.content)
    }
  }

  const onDelete = (id: string) => {
    del.mutate(id)
    if (id === resume?.id) {
      setResume(null)
      setContent(null)
    }
  }

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
          {/* Only the generator gates on personas — the library below always renders. */}
          {personas.length === 0 ? (
            <NoPersonasHint />
          ) : (
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
          )}
          {generate.error ? (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {generate.error.message}
            </p>
          ) : null}

          <DocumentList
            rows={rows}
            selectedId={resume?.id ?? null}
            onSelect={onSelect}
            onDelete={onDelete}
            emptyText="No résumés yet — generate your first one above."
            aria-label="Résumés"
          />

          {resume && content ? (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Editor — scrolls with the page. */}
              <ResumeContentEditor value={content} onChange={setContent} />
              {/* Preview + actions — sticky so they stay in view while you edit on the left. */}
              <div className="space-y-3 self-start lg:sticky lg:top-0">
                <div className="flex flex-wrap items-center gap-2">
                  <ResumeOutputBar resumeId={resume.id} />
                  <DownloadPdfButton content={content} fileName={`${(resume.title ?? 'resume').replace(/\s+/g, '-')}.pdf`} />
                  <Button type="button" size="sm" disabled={save.isPending} onClick={() => save.mutate({ content })}>
                    {save.isPending ? 'Saving…' : 'Save edits'}
                  </Button>
                </div>
                <ResumePreview content={content} />
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
