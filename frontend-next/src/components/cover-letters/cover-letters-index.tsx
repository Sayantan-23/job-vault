'use client'

import { useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import type { Persona, AiStatus } from '@/types/persona'
import type { CoverLetter } from '@/types/cover-letter'
import { Button } from '@/components/ui/button'
import { PageHeading } from '@/components/layout/app/page-heading'
import { AppPage } from '@/components/layout/app/app-page'
import { useAiStatus } from '@/hooks/use-ai-status'
import { useJobOptions, type JobOption } from '@/hooks/use-job-options'
import { usePersonas } from '@/hooks/use-personas'
import { useAllCoverLetters, useGenerateCoverLetter, useDeleteCoverLetter, type GenerateBody } from '@/hooks/use-cover-letters'
import { DocumentList, type DocumentRow } from '@/components/documents/document-list'
import { MutationErrorAlert } from '@/components/documents/mutation-error-alert'
import { useConfirm } from '@/hooks/use-confirm'
import { NewCoverLetterSheet } from './new-cover-letter-sheet'

interface Props {
  // SSR-fetched; undefined means the server fetch failed and the client hooks
  // should fetch on mount (a [] fallback would pin a false-empty library).
  initialPersonas?: Persona[] | undefined
  initialLetters?: CoverLetter[] | undefined
  aiStatus: AiStatus | undefined
}

// Adhoc letters carry their job context on the row; tracked ones join the jobs
// query client-side (the same list the picker fetches).
function letterContext(letter: CoverLetter, jobsById: Map<string, JobOption>): string {
  if (letter.adhocJob) return `${letter.adhocJob.company} · ${letter.adhocJob.title}`
  const job = letter.jobId ? jobsById.get(letter.jobId) : undefined
  return job ? `${job.company} · ${job.title}` : '—'
}

export function CoverLettersIndex({ initialPersonas, initialLetters, aiStatus }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { confirm, confirmDialog } = useConfirm()
  // The New sheet is URL-driven (?new=1) so another page (e.g. a JobDrawer) can
  // deep-link it open with a job pre-selected (?job=<id>).
  const sheetOpen = searchParams.get('new') === '1'
  const presetJobId = searchParams.get('job') ?? undefined
  const openSheet = () => router.push('/app/cover-letters?new=1')
  const closeSheet = () => router.push('/app/cover-letters')
  const { data: status } = useAiStatus(aiStatus)
  const { data: personas = [] } = usePersonas(initialPersonas)
  const { data: letters = [] } = useAllCoverLetters(initialLetters)
  const { data: jobs = [] } = useJobOptions()
  const generate = useGenerateCoverLetter()
  const del = useDeleteCoverLetter()

  const aiEnabled = status?.enabled ?? false
  const generatorEnabled = aiEnabled && personas.length > 0
  const jobsById = useMemo(() => new Map(jobs.map((j) => [j.id, j])), [jobs])
  const personaNames = useMemo(() => new Map(personas.map((p) => [p.id, p.name])), [personas])

  const rows: DocumentRow[] = letters.map((letter) => ({
    id: letter.id,
    title: letter.title ?? 'Untitled',
    context: letterContext(letter, jobsById),
    personaName: (letter.personaId && personaNames.get(letter.personaId)) || '—',
    createdAt: letter.createdAt,
  }))

  const onDelete = async (id: string) => {
    if (del.isPending) return // don't start a second delete while one is in flight
    const letter = letters.find((l) => l.id === id)
    if (
      await confirm({
        title: 'Delete cover letter?',
        description: letter?.title ? `"${letter.title}" will be permanently deleted.` : 'This cover letter will be permanently deleted.',
        confirmLabel: 'Delete',
        destructive: true,
      })
    ) {
      del.mutate(id)
    }
  }

  const onGenerate = (body: GenerateBody) => {
    generate.mutate(body, {
      // Routing to the new letter's editor leaves the cover-letters URL (and so
      // closes the URL-driven sheet) on its own — no separate close needed.
      onSuccess: (letter) => router.push(`/app/cover-letters/${letter.id}`),
    })
  }

  return (
    <>
      <AppPage>
        <PageHeading
          title="Cover letters"
          description="For tracked jobs or pasted descriptions"
          actions={
            <Button type="button" size="sm" onClick={openSheet}>
              <Plus className="size-4" aria-hidden="true" />
              New cover letter
            </Button>
          }
        />
        <div className="space-y-4">
          <MutationErrorAlert error={del.error} />
          <DocumentList
            rows={rows}
            selectedId={null}
            onSelect={(id) => router.push(`/app/cover-letters/${id}`)}
            onDelete={onDelete}
            emptyText={
              generatorEnabled
                ? 'No cover letters yet — create your first one.'
                : 'No cover letters yet.'
            }
            aria-label="Cover letters"
          />
        </div>
      </AppPage>
      <NewCoverLetterSheet
        open={sheetOpen}
        onOpenChange={(o) => (o ? openSheet() : closeSheet())}
        personas={personas}
        jobs={jobs}
        aiEnabled={aiEnabled}
        isPending={generate.isPending}
        error={generate.error}
        onGenerate={onGenerate}
        initialJobId={presetJobId}
      />
      {confirmDialog}
    </>
  )
}
