'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus } from 'lucide-react'
import type { Persona, AiStatus } from '@/types/persona'
import type { CoverLetter } from '@/types/cover-letter'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/app/page-header'
import { useAiStatus } from '@/hooks/use-ai-status'
import { useJobOptions, type JobOption } from '@/hooks/use-job-options'
import { usePersonas } from '@/hooks/use-personas'
import { useAllCoverLetters, useGenerateCoverLetter, useDeleteCoverLetter, type GenerateBody } from '@/hooks/use-cover-letters'
import { DocumentList, type DocumentRow } from '@/components/documents/document-list'
import { MutationErrorAlert } from '@/components/documents/mutation-error-alert'
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
  const [sheetOpen, setSheetOpen] = useState(false)
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

  const onGenerate = (body: GenerateBody) => {
    generate.mutate(body, {
      onSuccess: (letter) => {
        setSheetOpen(false)
        router.push(`/app/cover-letters/${letter.id}`)
      },
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Cover letters"
        description="For tracked jobs or pasted descriptions"
        actions={
          <Button type="button" size="sm" onClick={() => setSheetOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            New cover letter
          </Button>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          <MutationErrorAlert error={del.error} />
          <DocumentList
            rows={rows}
            selectedId={null}
            onSelect={(id) => router.push(`/app/cover-letters/${id}`)}
            onDelete={(id) => del.mutate(id)}
            emptyText={
              generatorEnabled
                ? 'No cover letters yet — create your first one.'
                : 'No cover letters yet.'
            }
            aria-label="Cover letters"
          />
        </div>
      </div>
      <NewCoverLetterSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        personas={personas}
        jobs={jobs}
        aiEnabled={aiEnabled}
        isPending={generate.isPending}
        error={generate.error}
        onGenerate={onGenerate}
      />
    </div>
  )
}
