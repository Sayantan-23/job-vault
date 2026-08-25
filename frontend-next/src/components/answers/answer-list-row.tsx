'use client'

import type { KeyboardEvent, MouseEvent } from 'react'
import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { relativeTime } from '@/lib/relative-time'
import type { Answer } from '@/types/answer'
import { AnswerCopyChip } from './answer-copy-chip'

interface Props {
  answer: Answer
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onCopied: (id: string) => void
}

// The row hosts nested <button>s (two copy chips and delete), so it cannot be a
// <button> itself — nested buttons are invalid HTML. Same convention as
// DocumentListRow: a div with button semantics whose keydown ignores events
// bubbling up from those children.
export function AnswerListRow({ answer, onSelect, onDelete, onCopied }: Props) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return // bubbled from a chip or delete
    if (event.key !== 'Enter' && event.key !== ' ') return
    event.preventDefault()
    onSelect(answer.id)
  }

  const handleDelete = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onDelete(answer.id)
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(answer.id)}
      onKeyDown={handleKeyDown}
      className="flex cursor-pointer flex-col gap-2 px-3.5 py-3 text-sm transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:flex-row sm:items-center sm:gap-3"
    >
      <p className="min-w-0 truncate font-medium sm:flex-1">{answer.question}</p>
      {/* Below sm the row stacks: on one line the chips squeeze the question
          down to a few characters ("Why are yo…"), which makes the chips useless
          because you can't tell which answer you're copying. `sm:contents`
          dissolves this wrapper from sm up, so the desktop row is unchanged. */}
      <div className="flex items-center gap-1.5 sm:contents">
        {/* The chips are the fast path: copy without ever opening the editor.
          stopPropagation keeps a copy from also opening the drawer. */}
        <div className="flex shrink-0 items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
          {answer.answerShort ? (
            <AnswerCopyChip
              variant="short"
              text={answer.answerShort}
              question={answer.question}
              onCopied={() => onCopied(answer.id)}
            />
          ) : null}
          {answer.answerLong ? (
            <AnswerCopyChip
              variant="long"
              text={answer.answerLong}
              question={answer.question}
              onCopied={() => onCopied(answer.id)}
            />
          ) : null}
        </div>
        <span className="ml-auto w-24 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground sm:ml-0">
          {answer.lastUsedAt ? relativeTime(answer.lastUsedAt) : '—'}
        </span>
        <Button
          type="button"
          variant="ghost"
          size="iconSm"
          aria-label={`Delete “${answer.question}”`}
          onClick={handleDelete}
          className="h-8 w-8 shrink-0 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
        >
          <Trash2 className="size-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  )
}
