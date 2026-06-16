'use client'

import { useState } from 'react'
import { Sparkles, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  onTryAgain: (instructions?: string) => void
}

// The staged AI rewrite, shown in the same slot the letter occupies (one body on
// screen, never two). Accent border + header mark it as a proposal; a toggle
// compares against the current letter; "Fix grammar" shows a word-diff by default.
export function CoverLetterProposal({ action, candidate, currentBody, busy, onKeep, onDiscard, onTryAgain }: Props) {
  const isGrammar = action === 'fix-grammar'
  const [showAlt, setShowAlt] = useState(false)
  const [tweakOpen, setTweakOpen] = useState(false)
  const [tweak, setTweak] = useState('')

  // Non-grammar alt view = the current letter (compare-only); grammar alt = the
  // clean proposed text (the diff already contains the original).
  const viewingOriginal = !isGrammar && showAlt
  const toggleLabel = isGrammar ? (showAlt ? 'Show diff' : 'Show clean') : showAlt ? 'Show proposed' : 'Show original'

  const runTweak = () => {
    onTryAgain(tweak.trim() || undefined)
    setTweak('')
    setTweakOpen(false)
  }

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

      <div className="space-y-2 border-t border-border/60 px-4 py-2">
        <div className="flex flex-wrap items-center gap-2">
          {!viewingOriginal ? (
            <Button type="button" size="sm" onClick={onKeep} disabled={busy}>
              Keep
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" onClick={() => setShowAlt((v) => !v)} disabled={busy}>
            {toggleLabel}
          </Button>
          {!viewingOriginal ? (
            <div className="flex items-center">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onTryAgain()}
                disabled={busy}
                className="rounded-r-none"
              >
                {busy ? 'Improving…' : 'Try again'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Try again with new instructions"
                aria-expanded={tweakOpen}
                onClick={() => setTweakOpen((v) => !v)}
                disabled={busy}
                className="rounded-l-none px-1.5"
              >
                <ChevronDown className="size-3.5" aria-hidden="true" />
              </Button>
            </div>
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

        {tweakOpen && !viewingOriginal ? (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault()
              runTweak()
            }}
          >
            <Input
              value={tweak}
              onChange={(e) => setTweak(e.target.value)}
              placeholder="Adjust the instructions, e.g. more concise…"
              aria-label="New instructions for try again"
              disabled={busy}
            />
            <Button type="submit" size="sm" disabled={busy}>
              Regenerate
            </Button>
          </form>
        ) : null}
      </div>
    </div>
  )
}
