'use client'

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { useRouter } from 'next/navigation'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { Search, X } from 'lucide-react'
import { DialogOverlay } from '@/components/ui/dialog'
import { useSearch } from '@/hooks/use-search'
import { searchResultHref, type SearchResult } from '@/types/search'
import { cn } from '@/lib/utils'
import { SearchResults, searchOptionId } from './search-results'
import { SearchTrigger } from './search-trigger'

// `CSSProperties` doesn't type custom properties; cast through a parameter
// rather than an inline object-literal assertion (consistent-type-assertions).
function cssVars(vars: Record<string, string>): CSSProperties {
  return vars as CSSProperties
}

// Matches the backend's own floor: below two characters the API returns [].
const MIN_TERM = 2

/**
 * Global search. The card is a Radix Dialog Content restyled as a palette, so
 * focus trap, Escape, scroll lock and focus return are the primitive's; only the
 * geometry — the morph out of the trigger — is ours (`d-0cbc74`). Radix supplies
 * no combobox semantics, so the input/listbox wiring is built here.
 */
export function SearchPalette({ className }: { className?: string }) {
  const router = useRouter()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = `${useId()}search`
  const [open, setOpen] = useState(false)
  const [origin, setOrigin] = useState<CSSProperties>()
  const [term, setTerm] = useState('')
  const [active, setActive] = useState(0)

  const { data, isFetching } = useSearch(term)
  const expanded = term.trim().length >= MIN_TERM
  const results = expanded ? (data ?? []) : []
  const activeIndex = Math.min(active, results.length - 1)

  const openFrom = useCallback(() => {
    const rect = triggerRef.current?.getBoundingClientRect()
    // The palette is mounted twice — desktop cluster and mobile header — but only
    // one of the two is displayed at any width, and a display:none trigger
    // measures zero. So the off-screen instance ignores the chord, and the origin
    // is always the rect of the trigger the user can actually see.
    if (!rect || rect.width === 0) return
    setOrigin(
      cssVars({
        '--jv-search-x': `${rect.left + rect.width / 2}px`,
        '--jv-search-y': `${rect.top}px`,
        '--jv-search-size': `${rect.width}px`,
      }),
    )
    setOpen(true)
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (!(event.metaKey || event.ctrlKey) || event.key.toLowerCase() !== 'k') return
      event.preventDefault()
      openFrom()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [openFrom])

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (!next) {
      setTerm('')
      setActive(0)
    }
  }

  function select(result: SearchResult) {
    handleOpenChange(false)
    router.push(searchResultHref(result))
  }

  function onInputKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (results.length === 0) return
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (Math.min(i, results.length - 1) + step + results.length) % results.length)
      return
    }
    if (event.key === 'Enter') {
      const hit = results[activeIndex]
      if (!hit) return
      event.preventDefault()
      select(hit)
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={handleOpenChange}>
      <SearchTrigger
        ref={triggerRef}
        paletteOpen={open}
        onOpen={openFrom}
        className={className}
      />
      <DialogPrimitive.Portal>
        <DialogOverlay />
        <DialogPrimitive.Content
          data-theme-scope="app"
          // A palette has no prose to describe it; this is Radix's documented
          // opt-out from its missing-Description dev warning.
          aria-describedby={undefined}
          style={origin}
          // dialog.tsx and sheet.tsx focus the panel instead of the first field,
          // because Radix's default selects a pre-filled input's text. A palette
          // has to land in its own input and there is nothing there to select.
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            inputRef.current?.focus()
          }}
          className={cn(
            'jv-search-card group z-50 flex flex-col overflow-hidden border border-border bg-card text-card-foreground shadow-lg focus:outline-none',
            'data-[state=open]:animate-jv-search-in data-[state=closed]:animate-jv-surface-out',
          )}
        >
          <DialogPrimitive.Title className="sr-only">Search</DialogPrimitive.Title>
          <div className="flex h-[var(--jv-search-head-h)] shrink-0 items-center gap-3 px-4 group-data-[state=open]:animate-jv-search-content-in motion-reduce:animate-none">
            <Search className="size-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              autoComplete="off"
              aria-label="Search jobs, résumés, cover letters, personas and answers"
              aria-autocomplete="list"
              aria-controls={listboxId}
              aria-expanded={results.length > 0}
              aria-activedescendant={
                results.length > 0 ? searchOptionId(listboxId, activeIndex) : undefined
              }
              placeholder="Search everything…"
              value={term}
              onChange={(event) => {
                setTerm(event.target.value)
                setActive(0)
              }}
              onKeyDown={onInputKeyDown}
              className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/60"
            />
            <DialogPrimitive.Close
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Close search"
            >
              <X className="size-4" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>
          {/* 0fr → 1fr grows the card to its content without measuring anything.
              The wrapper stays mounted so the very first expansion animates. */}
          <div
            className={cn(
              'grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
              expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
            )}
          >
            <div className="min-h-0 overflow-hidden">
              {expanded ? (
                <SearchResults
                  results={results}
                  loading={data === undefined || isFetching}
                  term={term.trim()}
                  listboxId={listboxId}
                  activeIndex={activeIndex}
                  onSelect={select}
                />
              ) : null}
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
