'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CoverLetter } from '@/types/cover-letter'
import type { AiStatus } from '@/types/persona'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/app/page-header'
import { useAiStatus } from '@/hooks/use-ai-status'
import { useCoverLetter, useUpdateCoverLetter, useDeleteCoverLetter } from '@/hooks/use-cover-letters'
import { CoverLetterEditor } from '@/components/resume/cover-letter-editor'
import { MutationErrorAlert } from '@/components/documents/mutation-error-alert'

// The dedicated single-letter editor surface (its own route) — full width, no
// list competing for scroll. AI refine + Edit/Preview + Copy/Download all live
// inside CoverLetterEditor; Save/Delete sit in the header.
export function CoverLetterEditorView({ initialLetter, aiStatus }: { initialLetter: CoverLetter; aiStatus: AiStatus | undefined }) {
  const router = useRouter()
  const { data: letter = initialLetter } = useCoverLetter(initialLetter.id, initialLetter)
  const { data: status } = useAiStatus(aiStatus)
  const save = useUpdateCoverLetter(letter.id)
  const del = useDeleteCoverLetter()
  const [body, setBody] = useState(initialLetter.bodyMarkdown)

  const aiEnabled = status?.enabled ?? false

  const onDelete = () => {
    del.mutate(letter.id, { onSuccess: () => router.push('/app/cover-letters') })
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title={letter.title ?? 'Cover letter'}
        back={{ href: '/app/cover-letters', label: 'Cover letters' }}
        actions={
          <>
            <Button type="button" size="sm" disabled={save.isPending} onClick={() => save.mutate({ bodyMarkdown: body })}>
              {save.isPending ? 'Saving…' : 'Save edits'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={del.isPending}
              onClick={onDelete}
              className="text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              Delete
            </Button>
          </>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        {/* Wider than a single letter column so the AI controls sit in a side rail
            (the letter itself stays letter-width inside CoverLetterEditor).
            Left-aligned — a centered block floats in whitespace on wide screens. */}
        <div className="max-w-5xl space-y-4">
          <CoverLetterEditor
            value={body}
            onChange={setBody}
            layout="split"
            // Only surface AI refine when AI is on — else every click would 503.
            {...(aiEnabled ? { coverLetterId: letter.id } : {})}
            fileName={`${(letter.title ?? 'cover-letter').replace(/\s+/g, '-')}.pdf`}
          />
          <MutationErrorAlert error={save.error} />
          <MutationErrorAlert error={del.error} />
        </div>
      </div>
    </div>
  )
}
