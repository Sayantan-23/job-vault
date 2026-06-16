'use client'

import type { Persona } from '@/types/persona'
import type { JobOption } from '@/hooks/use-job-options'
import type { GenerateBody } from '@/hooks/use-cover-letters'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { MutationErrorAlert } from '@/components/documents/mutation-error-alert'
import { NoPersonasHint } from '@/components/documents/no-personas-hint'
import { GenerateCoverLetterBar } from './generate-cover-letter-bar'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  personas: Persona[]
  jobs: JobOption[]
  aiEnabled: boolean
  isPending: boolean
  error: Error | null
  onGenerate: (body: GenerateBody) => void
}

function AiOffHint() {
  return (
    <p role="status" className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
      AI features are not configured.
    </p>
  )
}

// The "New cover letter" generator, opened from the library header — keeps the
// create form off the always-visible list (the surveyed pattern).
export function NewCoverLetterSheet({ open, onOpenChange, personas, jobs, aiEnabled, isPending, error, onGenerate }: Props) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="gap-0 p-6">
        <SheetTitle className="text-lg font-semibold">New cover letter</SheetTitle>
        <SheetDescription className="mt-0.5 text-xs text-muted-foreground">
          For a tracked job or a pasted description.
        </SheetDescription>
        <div className="mt-5 space-y-4">
          {!aiEnabled ? (
            <AiOffHint />
          ) : personas.length === 0 ? (
            <NoPersonasHint noun="cover letter" />
          ) : (
            <GenerateCoverLetterBar personas={personas} jobs={jobs} isPending={isPending} onGenerate={onGenerate} />
          )}
          <MutationErrorAlert error={error} />
        </div>
      </SheetContent>
    </Sheet>
  )
}
