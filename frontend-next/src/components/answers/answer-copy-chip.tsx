'use client'

import { CopyButton } from '@/components/documents/copy-button'

const LABEL = { short: 'S', long: 'L' } as const

interface Props {
  variant: 'short' | 'long'
  text: string
  // Only used to build a distinguishable accessible name — several rows would
  // otherwise all be called "Copy S".
  question: string
  onCopied: () => void
}

// One length variant's copy control: the visible label is the variant letter
// plus its CHARACTER count (ATS fields cap characters, never words), and the
// click both copies and stamps last_used_at through the caller — via CopyButton's
// onCopied, so a rejected clipboard write never stamps a copy that didn't happen.
export function AnswerCopyChip({ variant, text, question, onCopied }: Props) {
  return (
    <CopyButton
      getText={() => text}
      onCopied={onCopied}
      label={`${LABEL[variant]} ${text.length.toLocaleString()}`}
      copiedLabel="Copied"
      ariaLabel={`Copy the ${variant} answer to “${question}”`}
      className="h-7 font-mono tabular-nums"
    />
  )
}
