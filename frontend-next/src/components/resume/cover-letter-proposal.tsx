'use client'

import { useState } from 'react'
import { Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import type { RefineAction } from '@/types/cover-letter'
import { CoverLetterPreview } from './cover-letter-preview'
import { CoverLetterDiff } from './cover-letter-diff'

const ACTION_LABEL: Record<RefineAction, string> = {
  humanize: 'Humanize',
  shorten: 'Shorten',
  lengthen: 'Make longer',
  'fix-grammar': 'Fix grammar',
  custom: 'Custom',
}

interface Props {
  action: RefineAction
  candidate: string
  currentBody: string
  busy: boolean
  onKeep: () => void
  onDiscard: () => void
  onTryAgain: () => void
}

// The staged AI rewrite, shown in the same slot the letter occupies (one body on
// screen, never two). Accent border + header mark it as a proposal; a toggle
// compares against the current letter; "Fix grammar" shows a word-diff by default.
// Instructions are steered from the top "Improve with AI" panel only — Try again
// just re-rolls the same action (no second input here).
export function CoverLetterProposal({ action, candidate, currentBody, busy, onKeep, onDiscard, onTryAgain }: Props) {
  const isGrammar = action === 'fix-grammar'
  const [showAlt, setShowAlt] = useState(false)

  // Non-grammar alt view = the current letter (compare-only); grammar alt = the
  // clean proposed text (the diff already contains the original).
  const viewingOriginal = !isGrammar && showAlt
  const toggleLabel = isGrammar ? (showAlt ? 'Show diff' : 'Show clean') : showAlt ? 'Show proposed' : 'Show original'

  return (
    <div
      aria-live="polite"
      className={cn(
        'overflow-hidden rounded-lg border border-border',
        viewingOriginal ? 'bg-card' : 'border-l-2 border-l-primary bg-primary/[0.03]',
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border/60 px-4 py-2">
        {viewingOriginal ? (
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Current letter</span>
        ) : (
          <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-primary">
            <Sparkles className="size-3.5" aria-hidden="true" />
            Proposed rewrite
          </span>
        )}
        <span className="text-xs text-muted-foreground">{ACTION_LABEL[action]}</span>
      </div>

      <div className="px-4 py-3">
        {isGrammar ? (
          showAlt ? <CoverLetterPreview body={candidate} bare /> : <CoverLetterDiff current={currentBody} proposed={candidate} />
        ) : (
          <CoverLetterPreview body={showAlt ? currentBody : candidate} bare />
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-border/60 px-4 py-2">
        {!viewingOriginal ? (
          <Button type="button" size="sm" onClick={onKeep} disabled={busy}>
            Keep
          </Button>
        ) : null}
        <Button type="button" variant="outline" size="sm" onClick={() => setShowAlt((v) => !v)} disabled={busy}>
          {toggleLabel}
        </Button>
        {!viewingOriginal ? (
          <Button type="button" variant="ghost" size="sm" onClick={onTryAgain} disabled={busy}>
            {busy ? 'Improving…' : 'Try again'}
          </Button>
        ) : null}
        <div className="flex-1" />
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDiscard}
          disabled={busy}
          className="text-muted-foreground hover:text-foreground"
        >
          Discard
        </Button>
      </div>
    </div>
  )
}
