'use client'

import { useEffect, useState } from 'react'
import { Sparkles, Wand2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useRefineCoverLetter } from '@/hooks/use-cover-letters'
import { MutationErrorAlert } from '@/components/documents/mutation-error-alert'
import type { RefineAction } from '@/types/cover-letter'
import { CoverLetterProposal } from './cover-letter-proposal'

interface Props {
  coverLetterId: string
  currentBody: string
  onApply: (text: string) => void
  // Lets the editor hide its own body while a rewrite is staged, so only one
  // letter (the proposal) is ever on screen.
  onStagedChange?: (staged: boolean) => void
}

const PRESETS: ReadonlyArray<{ label: string; action: RefineAction }> = [
  { label: 'Humanize', action: 'humanize' },
  { label: 'Shorten', action: 'shorten' },
  { label: 'Make longer', action: 'lengthen' },
  { label: 'Fix grammar', action: 'fix-grammar' },
]

function RefineChip({ label, onClick, disabled }: { label: string; onClick: () => void; disabled: boolean }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick} disabled={disabled}>
      {label}
    </Button>
  )
}

export function CoverLetterRefine({ coverLetterId, currentBody, onApply, onStagedChange }: Props) {
  const refine = useRefineCoverLetter(coverLetterId)
  const [candidate, setCandidate] = useState<string | null>(null)
  const [lastAction, setLastAction] = useState<RefineAction | null>(null)
  const [lastInstructions, setLastInstructions] = useState<string | undefined>(undefined)
  const [instructions, setInstructions] = useState('')
  const [undoBody, setUndoBody] = useState<string | null>(null)
  // Bumped on every fresh candidate so the proposal pane remounts with clean view
  // state (diff/clean toggle, try-again tweak box) instead of carrying it over.
  const [proposalSeq, setProposalSeq] = useState(0)

  // Switching to a different letter must discard any staged rewrite/undo — else
  // a candidate generated for letter A could be kept into letter B's buffer.
  const { reset } = refine
  useEffect(() => {
    setCandidate(null)
    setUndoBody(null)
    setLastAction(null)
    setLastInstructions(undefined)
    setInstructions('')
    reset()
  }, [coverLetterId, reset])

  const staged = candidate !== null && lastAction !== null
  useEffect(() => {
    onStagedChange?.(staged)
  }, [staged, onStagedChange])

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
          setProposalSeq((s) => s + 1)
        },
      },
    )
  }

  function tryAgain(nextInstructions?: string) {
    if (!lastAction) return
    const instr = nextInstructions ?? lastInstructions
    refine.mutate(
      { action: lastAction, ...(instr ? { instructions: instr } : {}) },
      {
        onSuccess: (r) => {
          setCandidate(r.bodyMarkdown)
          setProposalSeq((s) => s + 1)
          if (nextInstructions !== undefined) setLastInstructions(nextInstructions || undefined)
        },
      },
    )
  }

  function keep() {
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
    <div className="space-y-3">
      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <Sparkles className="size-4 text-primary" aria-hidden="true" />
          Improve with AI
        </div>

        <div className="flex flex-wrap gap-2">
          {PRESETS.map((preset) => (
            <RefineChip key={preset.action} label={preset.label} disabled={busy} onClick={() => run(preset.action)} />
          ))}
        </div>

        <form
          className="flex items-end gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (trimmed) run('custom')
          }}
        >
          <Input
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Tell the AI what to change…"
            aria-label="Custom AI instructions"
            disabled={busy}
          />
          <Button type="submit" size="sm" disabled={busy || !trimmed}>
            <Wand2 className="size-3.5" aria-hidden="true" />
            {busy && !staged ? 'Improving…' : 'Improve'}
          </Button>
        </form>
      </div>

      <MutationErrorAlert error={refine.error} />

      {staged && candidate !== null && lastAction !== null ? (
        <CoverLetterProposal
          key={proposalSeq}
          action={lastAction}
          candidate={candidate}
          currentBody={currentBody}
          busy={busy}
          onKeep={keep}
          onDiscard={() => setCandidate(null)}
          onTryAgain={tryAgain}
        />
      ) : undoBody !== null ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>Applied to the editor — Save edits to keep it.</span>
          <Button type="button" variant="link" size="sm" className="h-auto px-0" onClick={undo}>
            <Undo2 className="size-3.5" aria-hidden="true" />
            Undo
          </Button>
        </div>
      ) : null}
    </div>
  )
}
