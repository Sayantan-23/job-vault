'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search jobs…',
  ariaLabel = 'Search jobs',
  className,
}: {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  ariaLabel?: string
  className?: string
}) {
  const [local, setLocal] = useState(value)
  const [lastValue, setLastValue] = useState(value)
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
  // The resync adjusts state during render (React's documented pattern) so the
  // field never commits a frame showing the stale term; the timer is a side
  // effect, so it is cleared from the effect below instead.
  if (lastValue !== value) {
    setLastValue(value)
    setLocal(value)
  }
  useEffect(() => {
    cancelPending()
  }, [value])

  // Cancel a pending timer on unmount.
  useEffect(() => () => cancelPending(), [])

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
    // basis-full puts the search on its own full-width line below sm; from sm up
    // it collapses to basis-0 + grow so it absorbs all space the fixed-width
    // siblings (select / toggle / add) leave over. A caller can pass className to
    // opt out of that below-sm line (twMerge lets `basis-0` beat `basis-full`) —
    // the answers header keeps the search inline with its action button at every width.
    <div className={cn('relative min-w-[8rem] grow basis-full sm:basis-0', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        type="text"
        role="searchbox"
        aria-label={ariaLabel}
        placeholder={placeholder}
        value={local}
        onChange={(e) => handleInput(e.target.value)}
        className="h-10 pl-9 pr-9"
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
