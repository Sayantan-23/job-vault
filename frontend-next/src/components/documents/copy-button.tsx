'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  // Resolves the text to copy. Async so callers can derive it lazily (e.g.
  // fetch a résumé's LaTeX) — the write still happens inside the click handler.
  getText: () => string | Promise<string>
  label?: string
  copiedLabel?: string
  // A stable accessible name. Without it the name flips with the visible text
  // (Copy↔Copied); with it (e.g. "Copy <document>") each row's control is also
  // distinguishable to AT when several rows share the same visible label.
  ariaLabel?: string
  className?: string
}

// Copy-to-clipboard button with a transient "Copied" confirmation. Renders a
// bare <button> (not the Button primitive) so the caller's className fully owns
// the look — the JobDrawer launcher rows pass a compact action style that must
// match the sibling download <a>.
export function CopyButton({ getText, label = 'Copy', copiedLabel = 'Copied', ariaLabel, className }: Props) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  const onClick = async () => {
    try {
      await navigator.clipboard.writeText(await getText())
      setCopied(true)
      clearTimeout(timer.current)
      timer.current = setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard denied (no permission / insecure context) — nothing to recover.
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-live="polite"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
    >
      {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
      {copied ? copiedLabel : label}
    </button>
  )
}
