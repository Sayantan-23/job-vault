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
import { SearchResults, groupByType, searchOptionId } from './search-results'
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
  const cardRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = `${useId()}search`
  const [open, setOpen] = useState(false)
  const [origin, setOrigin] = useState<CSSProperties>()
  const [term, setTerm] = useState('')
  const [active, setActive] = useState(0)

  const { data, isFetching, settled } = useSearch(term)
  const expanded = term.trim().length >= MIN_TERM
  // Grouped up front, not at render time: the palette traverses the very array
  // the listbox paints, so arrow keys follow the visible top-to-bottom order.
  const results = expanded ? groupByType(data ?? []) : []
  const activeIndex = Math.min(active, results.length - 1)

  const openFrom = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    // The palette is mounted twice — desktop cluster and mobile header — but only
    // one of the two is displayed at any width, and a display:none trigger
    // measures zero. So the off-screen instance ignores the chord, and the origin
    // is always the rect of the trigger the user can actually see.
    if (rect.width === 0) return
    // Where the card lands is the content column's centre, not the viewport's:
    // the rail offsets the column, so `left: 50%` sits ~120px off at 1440 and
    // puts the card's left edge over the nav at 1024. Measured rather than
    // offset by a hardcoded rail width, so it stays right when the rail
    // collapses and when the scrollbar width changes. The mobile header has no
    // column ancestor — leaving the var unset falls back to the viewport
    // centre in CSS, which is the correct answer there.
    const col = trigger.closest('.jv-content-col')?.getBoundingClientRect()
    setOrigin(
      cssVars({
        '--jv-search-x': `${rect.left + rect.width / 2}px`,
        '--jv-search-y': `${rect.top}px`,
        '--jv-search-size': `${rect.width}px`,
        ...(col ? { '--jv-search-cx': `${col.left + col.width / 2}px` } : {}),
      }),
    )
    // Reset here rather than on close: the close morph carries the card's real
    // content back into the trigger, so the results have to stay painted for the
    // length of the exit. Clearing on the way in is the same guarantee — every
    // open starts empty — without emptying the card mid-flight.
    setTerm('')
    setActive(0)
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
    // The card's open height is `auto` (the results list grows into it) and CSS
    // cannot interpolate *from* auto, so the exit's starting geometry is measured
    // here — the same measure-then-animate the open path does with the trigger's
    // rect. Batched with setOpen, so the vars are on the node in the very commit
    // that flips data-state to closed.
    const card = cardRef.current
    if (!next && card) {
      const rect = card.getBoundingClientRect()
      setOrigin((prev) => ({
        ...prev,
        ...cssVars({
          '--jv-search-out-top': `${rect.top}px`,
          '--jv-search-out-left': `${rect.left + rect.width / 2}px`,
          '--jv-search-out-w': `${rect.width}px`,
          '--jv-search-out-h': `${rect.height}px`,
        }),
      }))
    }
    setOpen(next)
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
          ref={cardRef}
          data-theme-scope="app"
          // A palette has no prose to describe it; this is Radix's documented
          // opt-out from its missing-Description dev warning.
          aria-describedby={undefined}
          style={origin}
          // dialog.tsx and sheet.tsx focus the panel instead of the first field,
          // because Radix's default selects a pre-filled input's text. A palette
          // has to land in its own input and there is nothing there to select.
          // preventScroll matters: the card is `overflow-hidden` and only 36px wide
          // in the morph's first frame, so focusing the input scrolls the card to
          // reveal it (measured scrollLeft 30, scrollTop 5) — which drags the header,
          // magnifier included, out of the clip box and leaves a blank pill.
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            inputRef.current?.focus({ preventScroll: true })
          }}
          className={cn(
            // `justify-center` only bites while the card is shorter than its header — i.e.
            // during the morph, where it keeps the 56px header (and so the magnifier)
            // centred on the 36px capsule instead of hanging 11px below the trigger's
            // icon. Once the card lands its height is content-driven, so it is inert.
            'jv-search-card group z-50 flex flex-col justify-center overflow-hidden border border-border bg-card text-card-foreground shadow-lg focus:outline-none',
            'data-[state=open]:animate-jv-search-in data-[state=closed]:animate-jv-search-out',
          )}
        >
          <DialogPrimitive.Title className="sr-only">Search</DialogPrimitive.Title>
          {/* The magnifier is what the morph is *about*: the same icon sits in the
              trigger and here, so it carries no fade at all. In the card's first frame
              it paints at full opacity 8px right of where the trigger's icon was and
              at exactly its height, then travels with the card. Only what cannot be
              read inside a 36px capsule — the placeholder, the close control — waits
              for the delayed fade, so the card is never a blank pill. */}
          {/* `max-h-full` is what keeps the magnifier centred once the card is
              smaller than its own header — both ends of the morph. The header
              shrinks with the box instead of overflowing it, so the icon lands on
              the trigger's icon rather than 10px below it. */}
          <div className="flex h-[var(--jv-search-head-h)] max-h-full shrink-0 items-center gap-3 px-4">
            <Search className="size-[18px] shrink-0 text-muted-foreground" aria-hidden="true" />
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              autoComplete="off"
              aria-label="Search jobs, résumés, cover letters, personas and answers"
              aria-autocomplete="list"
              aria-controls={listboxId}
              // The listbox is rendered for the whole expanded state, empty or
              // not, so this tracks the popup being on screen — not whether it
              // happens to hold options.
              aria-expanded={expanded}
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
              // motion-safe, not `motion-reduce:animate-none`: that utility sorts
              // *before* the group-data one at equal specificity and loses, which
              // left reduced-motion users staring at a blank card for 140ms.
              className="min-w-0 flex-1 bg-transparent text-[15px] text-foreground outline-none placeholder:text-muted-foreground/60 motion-safe:group-data-[state=open]:animate-jv-search-content-in motion-safe:group-data-[state=closed]:animate-jv-search-content-out"
            />
            <DialogPrimitive.Close
              className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-safe:group-data-[state=open]:animate-jv-search-content-in motion-safe:group-data-[state=closed]:animate-jv-search-content-out"
              aria-label="Close search"
            >
              <X className="size-4" aria-hidden="true" />
            </DialogPrimitive.Close>
          </div>
          {/* 0fr → 1fr grows the card to its content without measuring anything.
              The wrapper stays mounted so the very first expansion animates. */}
          <div
            className={cn(
              // `min-h-0`: while the card is shrinking back into the trigger its
              // height is a definite (animated) value, and this region has to give
              // it up — otherwise the flex column stays taller than the box and
              // `justify-center` slides the header, magnifier included, out of view.
              'grid min-h-0 transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none',
              expanded ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
            )}
          >
            <div className="min-h-0 overflow-hidden">
              {expanded ? (
                <SearchResults
                  results={results}
                  // Not settled = the query for what is on screen has not been
                  // sent yet, which is still loading from the user's side.
                  // Without it the palette reports "no matches" for the previous
                  // term's empty answer for the length of the debounce.
                  loading={!settled || data === undefined || isFetching}
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
