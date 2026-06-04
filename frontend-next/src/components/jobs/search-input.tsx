'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search jobs…',
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}) {
  const [local, setLocal] = useState(value)
  const ref = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function cancelPending() {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }

  // When the URL value changes from OUTSIDE the field (back/forward, Clear all,
  // resetAll), resync the field and cancel any pending debounced emit — otherwise
  // a still-pending keystroke would re-push the stale term and undo the reset.
  useEffect(() => {
    setLocal(value)
    cancelPending()
  }, [value])

  // Cancel a pending timer on unmount.
  useEffect(() => () => cancelPending(), [])

  // Cmd/Ctrl+K focuses the search field.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        ref.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Debounce only the user's own typing (300ms), driven from the input handler —
  // never from a derived effect, so it can't race an external value change.
  function handleInput(next: string) {
    setLocal(next)
    cancelPending()
    timer.current = setTimeout(() => onChange(next), 300)
  }

  function clear() {
    cancelPending()
    setLocal('')
    onChange('')
  }

  return (
    // type="text" (not "search") so the browser doesn't add its own native clear
    // button alongside ours; role="searchbox" keeps the search a11y semantics.
    <div className="relative min-w-[8rem] flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        ref={ref}
        type="text"
        role="searchbox"
        aria-label="Search jobs"
        placeholder={placeholder}
        value={local}
        onChange={(e) => handleInput(e.target.value)}
        className="pl-9 pr-9"
      />
      {local ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={clear}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}
