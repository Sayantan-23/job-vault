'use client'

import type { Answer } from '@/types/answer'
import { AnswerListRow } from './answer-list-row'

interface Props {
  answers: Answer[]
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onCopied: (id: string) => void
}

function EmptyState() {
  return (
    <p className="py-10 text-center font-serif text-lg text-muted-foreground">
      No saved answers yet. The next form question you answer well is worth keeping.
    </p>
  )
}

// Deliberately not the shared DocumentList: DocumentRow is a fixed four-field
// shape (title/context/personaName/createdAt) with no slot for interactive
// children, and an answer row carries no context or persona while needing two
// copy chips inside it.
export function AnswerList({ answers, onSelect, onDelete, onCopied }: Props) {
  if (answers.length === 0) return <EmptyState />

  return (
    <ul aria-label="Saved answers" className="divide-y divide-hairline">
      {answers.map((answer) => (
        <li key={answer.id}>
          <AnswerListRow answer={answer} onSelect={onSelect} onDelete={onDelete} onCopied={onCopied} />
        </li>
      ))}
    </ul>
  )
}
