'use client'

import { useState } from 'react'
import { Sparkles, Wand2, ArrowUp, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { useRefineCoverLetter } from '@/hooks/use-cover-letters'
import { MutationErrorAlert } from '@/components/documents/mutation-error-alert'
import type { RefineAction } from '@/types/cover-letter'
import { CoverLetterPreview } from './cover-letter-preview'

interface Props {
  coverLetterId: string
  currentBody: string
  onApply: (text: string) => void
}

// The preset refine actions, in display order. Each maps a human label to the
// RefineAction the backend understands.
const PRESETS: ReadonlyArray<{ label: string; action: RefineAction }> = [
  { label: 'Humanize', action: 'humanize' },
  { label: 'Shorten', action: 'shorten' },
  { label: 'Make longer', action: 'lengthen' },
  { label: 'Fix grammar', action: 'fix-grammar' },
]

// A single preset action as a small outline pill.
function RefineChip({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled: boolean
}) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick} disabled={disabled}>
      {label}
    </Button>
  )
}

// The Replace / Try again / Discard controls shown under a staged candidate.
function PreviewActions({
  onReplace,
  onTryAgain,
  onDiscard,
  busy,
}: {
  onReplace: () => void
  onTryAgain: () => void
  onDiscard: () => void
  busy: boolean
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" size="sm" onClick={onReplace} disabled={busy}>
        Replace
      </Button>
      <Button type="button" variant="outline" size="sm" onClick={onTryAgain} disabled={busy}>
        {busy ? 'Improving…' : 'Try again'}
      </Button>
      <Button type="button" variant="ghost" size="sm" onClick={onDiscard} disabled={busy}>
        Discard
      </Button>
    </div>
  )
}

export function CoverLetterRefine({ coverLetterId, currentBody, onApply }: Props) {
  const refine = useRefineCoverLetter(coverLetterId)
  const [candidate, setCandidate] = useState<string | null>(null)
  const [lastAction, setLastAction] = useState<RefineAction | null>(null)
  const [lastInstructions, setLastInstructions] = useState<string | undefined>(undefined)
  const [instructions, setInstructions] = useState('')
  const [undoBody, setUndoBody] = useState<string | null>(null)

  const busy = refine.isPending
  const trimmed = instructions.trim()

  function run(action: RefineAction) {
    setUndoBody(null)
    refine.mutate(
      { action, ...(trimmed ? { instructions: trimmed } : {}) },
      {
        onSuccess: (r) => {
          setCandidate(r.bodyMarkdown)
          setLastAction(action)
          setLastInstructions(trimmed || undefined)
        },
      },
    )
  }

  function tryAgain() {
    if (!lastAction) return
    refine.mutate(
      { action: lastAction, ...(lastInstructions ? { instructions: lastInstructions } : {}) },
      { onSuccess: (r) => setCandidate(r.bodyMarkdown) },
    )
  }

  function replace() {
    if (candidate === null) return
    setUndoBody(currentBody)
    onApply(candidate)
    setCandidate(null)
  }

  function undo() {
    if (undoBody === null) return
    onApply(undoBody)
    setUndoBody(null)
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-medium text-foreground">
        <Sparkles className="size-4 text-primary" aria-hidden="true" />
        Improve with AI
      </div>

      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <RefineChip
            key={preset.action}
            label={preset.label}
            disabled={busy}
            onClick={() => run(preset.action)}
          />
        ))}
      </div>

      <form
        className="flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (trimmed) run('custom')
        }}
      >
        <div className="flex-1 space-y-1.5">
          <Label htmlFor="cl-refine-instructions" className="sr-only">
            Tell the AI what to change
          </Label>
          <Input
            id="cl-refine-instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Tell the AI what to change…"
            disabled={busy}
          />
        </div>
        <Button type="submit" size="sm" className="h-11" disabled={busy || !trimmed}>
          <Wand2 className="size-3.5" aria-hidden="true" />
          {busy ? 'Improving…' : 'Improve'}
        </Button>
      </form>

      <MutationErrorAlert error={refine.error} />

      {candidate !== null ? (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Proposed rewrite
          </p>
          <CoverLetterPreview body={candidate} />
          <PreviewActions
            busy={busy}
            onReplace={replace}
            onTryAgain={tryAgain}
            onDiscard={() => setCandidate(null)}
          />
        </div>
      ) : undoBody !== null ? (
        <div className={cn('flex items-center gap-2 text-sm text-muted-foreground')}>
          <span>Letter updated · </span>
          <Button type="button" variant="link" size="sm" className="h-auto px-0" onClick={undo}>
            <Undo2 className="size-3.5" aria-hidden="true" />
            Undo
          </Button>
        </div>
      ) : null}
    </div>
  )
}
