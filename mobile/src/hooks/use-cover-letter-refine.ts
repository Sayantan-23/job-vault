import { useCallback, useEffect, useRef, useState } from 'react';

import { useRefineCoverLetter } from '@/hooks/use-cover-letters';
import type { RefineAction } from '@/types/cover-letter';

export function useCoverLetterRefine(
  coverLetterId: string,
  currentBody: string,
  onApply: (text: string) => void
) {
  const refine = useRefineCoverLetter(coverLetterId);
  const [candidate, setCandidate] = useState<string | null>(null);
  const [lastAction, setLastAction] = useState<RefineAction | null>(null);
  const [lastInstructions, setLastInstructions] = useState<string | undefined>(undefined);
  const [undoBody, setUndoBody] = useState<string | null>(null);
  const [proposalSeq, setProposalSeq] = useState(0);

  const prevIdRef = useRef(coverLetterId);
  useEffect(() => {
    if (prevIdRef.current !== coverLetterId) {
      prevIdRef.current = coverLetterId;
      setCandidate(null);
      setUndoBody(null);
      setLastAction(null);
      setLastInstructions(undefined);
      refine.reset();
    }
  }, [coverLetterId, refine]);

  const run = useCallback(
    (action: RefineAction, instructions?: string) => {
      const trimmed = instructions?.trim();
      setUndoBody(null);
      refine.mutate(
        { action, ...(trimmed ? { instructions: trimmed } : {}) },
        {
          onSuccess: (r) => {
            setCandidate(r.bodyMarkdown);
            setLastAction(action);
            setLastInstructions(trimmed || undefined);
            setProposalSeq((s) => s + 1);
          },
        }
      );
    },
    [refine]
  );

  const tryAgain = useCallback(() => {
    if (!lastAction) return;
    refine.mutate(
      { action: lastAction, ...(lastInstructions ? { instructions: lastInstructions } : {}) },
      {
        onSuccess: (r) => {
          setCandidate(r.bodyMarkdown);
          setProposalSeq((s) => s + 1);
        },
      }
    );
  }, [refine, lastAction, lastInstructions]);

  const keep = useCallback(() => {
    if (candidate === null) return;
    setUndoBody(currentBody);
    onApply(candidate);
    setCandidate(null);
  }, [candidate, currentBody, onApply]);

  const discard = useCallback(() => setCandidate(null), []);

  const undo = useCallback(() => {
    if (undoBody === null) return;
    onApply(undoBody);
    setUndoBody(null);
  }, [undoBody, onApply]);

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
  };
}
