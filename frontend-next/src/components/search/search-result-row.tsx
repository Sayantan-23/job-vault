'use client'

import { useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { SearchResult, SearchResultType } from '@/types/search'

// The visible group label is decorative (aria-hidden), so each option names its
// own type — otherwise a screen reader hears five kinds of hit with no way to
// tell them apart.
const TYPE_NAMES: Record<SearchResultType, string> = {
  job: 'Job',
  resume: 'Résumé',
  coverLetter: 'Cover letter',
  persona: 'Persona',
  answer: 'Answer',
}

const SENTINELS = /[\u0002\u0003]/

/**
 * `ts_headline` wraps matches in STX/ETX control characters rather than
 * `<b>`/`</b>`: one snippet source is job markdown scraped from third-party
 * pages, so it is never trusted markup. Splitting on the sentinels leaves every
 * fragment a React text node — there is no HTML path through this feature at all.
 */
function SearchSnippet({ text }: { text: string }) {
  return (
    <>
      {text.split(SENTINELS).map((part, i) =>
        i % 2 === 1 ? (
          <mark key={i} className="rounded-[3px] bg-primary/10 px-0.5 text-foreground">
            {part}
          </mark>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  )
}

/** One result — a listbox option. Selection moves via `aria-activedescendant`,
 *  so the row is never focused and owns no key handling of its own. */
export function SearchResultRow({
  result,
  id,
  active,
  onSelect,
}: {
  result: SearchResult
  id: string
  active: boolean
  onSelect: () => void
}) {
  const ref = useRef<HTMLLIElement>(null)

  // Nothing scrolls the active option into view on its own: focus stays in the
  // input, only the aria-activedescendant pointer moves.
  useEffect(() => {
    if (active) ref.current?.scrollIntoView({ block: 'nearest' })
  }, [active])

  return (
    <li
      ref={ref}
      id={id}
      role="option"
      aria-selected={active}
      onClick={onSelect}
      className={cn(
        'cursor-pointer scroll-my-2 rounded-lg px-2.5 py-2 transition-colors',
        active ? 'bg-accent' : 'hover:bg-accent/50',
      )}
    >
      <span className="sr-only">{TYPE_NAMES[result.type]}: </span>
      <p className="truncate text-sm font-medium text-foreground">{result.title}</p>
      {result.subtitle ? (
        <p className="truncate text-xs text-muted-foreground">{result.subtitle}</p>
      ) : null}
      {result.snippet ? (
        <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
          <SearchSnippet text={result.snippet} />
        </p>
      ) : null}
    </li>
  )
}
