'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRefineCoverLetter } from '@/hooks/use-cover-letters'
import type { RefineAction } from '@/types/cover-letter'

// Owns the AI-refine workflow state so the editor can render the trigger controls
// (rail) and the staged proposal (main column) in separate places. Pass a falsy
// id when refine is unavailable — the hook stays inert (it is always called, to
// respect the rules of hooks).
export function useCoverLetterRefine(coverLetterId: string, currentBody: string, onApply: (text: string) => void) {
  const refine = useRefineCoverLetter(coverLetterId)
  const [candidate, setCandidate] = useState<string | null>(null)
  const [lastAction, setLastAction] = useState<RefineAction | null>(null)
  const [lastInstructions, setLastInstructions] = useState<string | undefined>(undefined)
  const [undoBody, setUndoBody] = useState<string | null>(null)
  // Bumped on every fresh candidate so the proposal pane remounts with clean view
  // state (diff/clean toggle) instead of carrying it over.
  const [proposalSeq, setProposalSeq] = useState(0)

  // Switching to a different letter discards any staged rewrite/undo, else a
  // candidate for letter A could be kept into letter B's buffer. Clearing it
  // during render (React's documented pattern for syncing to changed input)
  // closes that leak completely: an effect would let the stale candidate commit
  // for one frame under the new letter's id before it was cleared.
  const [seenId, setSeenId] = useState(coverLetterId)
  if (seenId !== coverLetterId) {
    setSeenId(coverLetterId)
    setCandidate(null)
    setUndoBody(null)
    setLastAction(null)
    setLastInstructions(undefined)
    setProposalSeq(0)
  }

  // The mutation's own cached result/error is external state, so it is dropped
  // from an effect rather than during render. `reset` is stable in TanStack v5.
  const { reset } = refine
  useEffect(() => {
    reset()
  }, [coverLetterId, reset])

  const run = useCallback(
    (action: RefineAction, instructions?: string) => {
      const trimmed = instructions?.trim()
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
    },
    [refine],
  )

  const tryAgain = useCallback(() => {
    if (!lastAction) return
    refine.mutate(
      { action: lastAction, ...(lastInstructions ? { instructions: lastInstructions } : {}) },
      {
        onSuccess: (r) => {
          setCandidate(r.bodyMarkdown)
          setProposalSeq((s) => s + 1)
        },
      },
    )
  }, [refine, lastAction, lastInstructions])

  const keep = useCallback(() => {
    if (candidate === null) return
    setUndoBody(currentBody)
    onApply(candidate)
    setCandidate(null)
  }, [candidate, currentBody, onApply])

  const discard = useCallback(() => setCandidate(null), [])

  const undo = useCallback(() => {
    if (undoBody === null) return
    onApply(undoBody)
    setUndoBody(null)
  }, [undoBody, onApply])

  return {
    busy: refine.isPending,
    error: refine.error,
    staged: candidate !== null && lastAction !== null,
    candidate,
    lastAction,
    undoBody,
    proposalSeq,
    run,
    tryAgain,
    keep,
    discard,
    undo,
  }
}
