'use client'

import { useMemo, useState } from 'react'
import type { Persona, AiStatus } from '@/types/persona'
import type { CoverLetter } from '@/types/cover-letter'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/app/page-header'
import { useAiStatus } from '@/hooks/use-ai-status'
import { useJobOptions, type JobOption } from '@/hooks/use-job-options'
import { usePersonas } from '@/hooks/use-personas'
import { useRevealBelowLg } from '@/hooks/use-reveal-below-lg'
import {
  useAllCoverLetters,
  useGenerateCoverLetter,
  useUpdateCoverLetter,
  useDeleteCoverLetter,
  type GenerateBody,
} from '@/hooks/use-cover-letters'
import { CoverLetterEditor } from '@/components/resume/cover-letter-editor'
import { DocumentList, type DocumentRow } from '@/components/documents/document-list'
import { MutationErrorAlert } from '@/components/documents/mutation-error-alert'
import { NoPersonasHint } from '@/components/documents/no-personas-hint'
import { GenerateCoverLetterBar } from './generate-cover-letter-bar'

interface Props {
  // SSR-fetched; undefined means the server fetch failed and the client
  // hooks should fetch on mount instead (a [] fallback would be installed
  // as fresh initialData and pin a false-empty state).
  initialPersonas?: Persona[] | undefined
  initialLetters?: CoverLetter[] | undefined
  aiStatus: AiStatus | undefined
}

function AiOffHint() {
  return (
    <p role="status" className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
      AI features are not configured.
    </p>
  )
}

function SelectLetterHint({ generatorEnabled }: { generatorEnabled: boolean }) {
  return (
    <p className="rounded-lg border border-dashed border-border px-3 py-8 text-center text-sm text-muted-foreground">
      {generatorEnabled ? 'Select a letter or generate a new one.' : 'Select a letter to view and edit it.'}
    </p>
  )
}

// Adhoc letters carry their job context on the row; tracked ones join the
// jobs query client-side (the same list the picker fetches).
function letterContext(letter: CoverLetter, jobsById: Map<string, JobOption>): string {
  if (letter.adhocJob) return `${letter.adhocJob.company} · ${letter.adhocJob.title}`
  const job = letter.jobId ? jobsById.get(letter.jobId) : undefined
  return job ? `${job.company} · ${job.title}` : '—'
}

export function CoverLettersWorkspace({ initialPersonas, initialLetters, aiStatus }: Props) {
  const [active, setActive] = useState<CoverLetter | null>(null)
  const [body, setBody] = useState('')
  const { data: status } = useAiStatus(aiStatus)
  const { data: personas = [] } = usePersonas(initialPersonas)
  const { data: letters = [] } = useAllCoverLetters(initialLetters)
  const { data: jobs = [] } = useJobOptions()
  const generate = useGenerateCoverLetter()
  const save = useUpdateCoverLetter(active?.id ?? '')
  const del = useDeleteCoverLetter()
  const editorPane = useRevealBelowLg<HTMLDivElement>()

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

  const open = (letter: CoverLetter) => {
    setActive(letter)
    setBody(letter.bodyMarkdown)
    editorPane.reveal()
  }

  const onGenerate = (generateBody: GenerateBody) => {
    generate.mutate(generateBody, { onSuccess: open })
  }

  const onSelect = (id: string) => {
    const letter = letters.find((l) => l.id === id)
    if (letter) open(letter)
  }

  const onDelete = (id: string) => {
    del.mutate(id, {
      // Only clear the editor once the delete actually lands — a failure
      // keeps the letter open (and surfaces the alert below the generator).
      onSuccess: () => {
        if (id === active?.id) {
          setActive(null)
          setBody('')
        }
      },
    })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader title="Cover letters" description="For tracked jobs or pasted descriptions" />
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="space-y-6">
          {/* Only the generator gates on AI/personas — the library below always renders. */}
          {!aiEnabled ? (
            <AiOffHint />
          ) : personas.length === 0 ? (
            <NoPersonasHint noun="cover letter" />
          ) : (
            <GenerateCoverLetterBar
              personas={personas}
              jobs={jobs}
              isPending={generate.isPending}
              onGenerate={onGenerate}
            />
          )}
          <MutationErrorAlert error={generate.error} />
          <MutationErrorAlert error={del.error} />

          <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <DocumentList
              rows={rows}
              selectedId={active?.id ?? null}
              onSelect={onSelect}
              onDelete={onDelete}
              emptyText={
                generatorEnabled ? 'No cover letters yet — generate your first one above.' : 'No cover letters yet.'
              }
              aria-label="Cover letters"
            />
            {/* Always-mounted wrapper so reveal() has a scroll target even
                before the editor mounts on select/generate. */}
            <div ref={editorPane.ref} className="space-y-3 self-start lg:sticky lg:top-0">
              {active ? (
                <>
                  <CoverLetterEditor
                    value={body}
                    onChange={setBody}
                    // Only surface AI refine when AI is on — else the panel would
                    // 503 on every click (the JobDrawer gates the same way).
                    {...(aiEnabled ? { coverLetterId: active.id } : {})}
                    fileName={`${(active.title ?? 'cover-letter').replace(/\s+/g, '-')}.pdf`}
                  />
                  <Button type="button" size="sm" disabled={save.isPending} onClick={() => save.mutate({ bodyMarkdown: body })}>
                    {save.isPending ? 'Saving…' : 'Save edits'}
                  </Button>
                  <MutationErrorAlert error={save.error} />
                </>
              ) : (
                <SelectLetterHint generatorEnabled={generatorEnabled} />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
