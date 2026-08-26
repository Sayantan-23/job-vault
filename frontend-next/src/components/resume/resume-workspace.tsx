'use client'

import { useEffect, useMemo, useState } from 'react'
import type { GeneratedResume, ResumeContent } from '@/types/resume'
import { useGenerateResume, useUpdateResume, useResumes, useDeleteResume } from '@/hooks/use-resumes'
import { useJobOptions, type JobOption } from '@/hooks/use-job-options'
import { usePersonas } from '@/hooks/use-personas'
import { useRevealBelowLg } from '@/hooks/use-reveal-below-lg'
import { useConfirm } from '@/hooks/use-confirm'
import { GenerateResumeBar } from './generate-resume-bar'
import { ResumePreview } from './resume-preview'
import { ResumeContentEditor } from './resume-content-editor'
import { ResumeOutputBar } from './resume-output-bar'
import { DownloadPdfButton } from './download-pdf-button'
import { Button } from '@/components/ui/button'
import { PageHeading } from '@/components/layout/app/page-heading'
import { AppPage } from '@/components/layout/app/app-page'
import { DocumentList, type DocumentRow } from '@/components/documents/document-list'
import { MutationErrorAlert } from '@/components/documents/mutation-error-alert'
import { NoPersonasHint } from '@/components/documents/no-personas-hint'

interface Props {
  initialPersonaId: string
  initialJobId?: string
  // Deep-link a specific résumé open (?resume=<id>) — selected once it appears
  // in the library; opening from a JobDrawer launcher row.
  initialResumeId?: string
}

// Tracked generations join their job client-side (the same list the picker
// fetches); jobless ones read 'General'.
function resumeContext(r: GeneratedResume, jobsById: Map<string, JobOption>): string {
  const job = r.jobId ? jobsById.get(r.jobId) : undefined
  return job ? `${job.company} · ${job.title}` : 'General'
}

export function ResumeWorkspace({ initialPersonaId, initialJobId, initialResumeId }: Props) {
  const { data: personas = [] } = usePersonas()
  const [personaId, setPersonaId] = useState(initialPersonaId || personas[0]?.id || '')
  const [jobId, setJobId] = useState(initialJobId ?? '')
  const [resume, setResume] = useState<GeneratedResume | null>(null)
  const [content, setContent] = useState<ResumeContent | null>(null)
  const generate = useGenerateResume()
  const save = useUpdateResume(resume?.id ?? '')
  const del = useDeleteResume()
  const { data: jobs = [] } = useJobOptions()
  const { data: allResumes = [] } = useResumes()
  const { ref: editorRef, reveal: revealEditor } = useRevealBelowLg<HTMLDivElement>()
  const { confirm, confirmDialog } = useConfirm()

  const jobsById = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs])
  const personaNames = useMemo(() => new Map(personas.map((p) => [p.id, p.name])), [personas])

  // Open the deep-linked résumé (?resume=<id>) once it lands in the library.
  // Tracks the applied id (not a boolean) so navigating to a different ?resume
  // re-opens, but a manual row click afterwards is never clobbered. Selecting it
  // is a state sync, so it happens during render; the scroll is a side effect,
  // so it waits for the effect below — by which point the editor is mounted.
  const [appliedResumeId, setAppliedResumeId] = useState<string | null>(null)
  const pendingResumeId = initialResumeId && appliedResumeId !== initialResumeId ? initialResumeId : undefined
  const deepLinked = pendingResumeId ? allResumes.find((r) => r.id === pendingResumeId) : undefined
  if (pendingResumeId && deepLinked) {
    setAppliedResumeId(pendingResumeId)
    setResume(deepLinked)
    setContent(deepLinked.content)
  }
  useEffect(() => {
    if (appliedResumeId) revealEditor()
  }, [appliedResumeId, revealEditor])

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
      revealEditor()
    }
  }

  const onDelete = async (id: string) => {
    if (del.isPending) return // don't start a second delete while one is in flight
    const target = allResumes.find((r) => r.id === id)
    if (
      !(await confirm({
        title: 'Delete résumé?',
        description: target?.title ? `"${target.title}" will be permanently deleted.` : 'This résumé will be permanently deleted.',
        confirmLabel: 'Delete',
        destructive: true,
      }))
    ) {
      return
    }
    del.mutate(id, {
      // Only clear the editor once the delete actually lands — a failure
      // keeps the résumé open (and surfaces the alert below the generator).
      onSuccess: () => {
        if (id === resume?.id) {
          setResume(null)
          setContent(null)
        }
      },
    })
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
          revealEditor()
        },
      },
    )
  }

  return (
    <>
      <AppPage>
        <PageHeading
          title="Résumés"
          description="Generate from a persona — optionally tailored to a job — or reopen a past one."
        />
        <div className="space-y-6">
          {/* Only the generator gates on personas — the library below always renders. */}
          {personas.length === 0 ? (
            <NoPersonasHint noun="résumé" />
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
          <MutationErrorAlert error={generate.error} />
          <MutationErrorAlert error={del.error} />

          <DocumentList
            rows={rows}
            selectedId={resume?.id ?? null}
            onSelect={onSelect}
            onDelete={onDelete}
            emptyText={personas.length > 0 ? 'No résumés yet — generate your first one above.' : 'No résumés yet.'}
            aria-label="Résumés"
          />

          {/* Always-mounted wrapper so reveal() has a scroll target even
              before the editor mounts on select/generate. */}
          <div ref={editorRef}>
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
                  <MutationErrorAlert error={save.error} />
                  <ResumePreview content={content} />
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </AppPage>
      {confirmDialog}
    </>
  )
}
