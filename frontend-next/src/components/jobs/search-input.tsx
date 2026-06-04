'use client'

import { useEffect, useRef, useState } from 'react'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { useDebouncedValue } from '@/hooks/use-debounced-value'

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
  const debounced = useDebouncedValue(local, 300)
  const ref = useRef<HTMLInputElement>(null)

  // Keep the field in sync when the URL value changes externally (back/forward, reset).
  useEffect(() => setLocal(value), [value])

  // Push the debounced value up, but never echo a value already in the URL
  // (prevents a write loop).
  useEffect(() => {
    if (debounced !== value) onChange(debounced)
  }, [debounced, value, onChange])

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

  return (
    <div className="relative w-full max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
      <Input
        ref={ref}
        type="search"
        role="searchbox"
        aria-label="Search jobs"
        placeholder={placeholder}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
        className="pl-9 pr-9"
      />
      {local ? (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => { setLocal(''); onChange('') }}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )
}
