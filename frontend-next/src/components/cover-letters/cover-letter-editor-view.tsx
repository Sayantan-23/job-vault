'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import type { CoverLetter } from '@/types/cover-letter'
import type { AiStatus } from '@/types/persona'
import { Button } from '@/components/ui/button'
import { PageHeading } from '@/components/layout/app/page-heading'
import { AppPage } from '@/components/layout/app/app-page'
import { useAiStatus } from '@/hooks/use-ai-status'
import { useCoverLetter, useUpdateCoverLetter, useDeleteCoverLetter } from '@/hooks/use-cover-letters'
import { useConfirm } from '@/hooks/use-confirm'
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
  const { confirm, confirmDialog } = useConfirm()

  const aiEnabled = status?.enabled ?? false

  const onDelete = async () => {
    if (
      await confirm({
        title: 'Delete cover letter?',
        description: letter.title ? `"${letter.title}" will be permanently deleted.` : 'This cover letter will be permanently deleted.',
        confirmLabel: 'Delete',
        destructive: true,
      })
    ) {
      del.mutate(letter.id, { onSuccess: () => router.push('/app/cover-letters') })
    }
  }

  return (
    <>
      <AppPage width="wide">
        <PageHeading
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
        {/* Wider than a single letter column so the AI controls sit in a side rail
            (the letter itself stays letter-width inside CoverLetterEditor).
            Left-aligned — a centered block floats in whitespace on wide screens. */}
        <div className="space-y-4">
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
      </AppPage>
      {confirmDialog}
    </>
  )
}
