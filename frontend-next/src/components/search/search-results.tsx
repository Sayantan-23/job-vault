'use client'

import { Skeleton } from '@/components/ui/skeleton'
import type { SearchResult, SearchResultType } from '@/types/search'
import { SearchResultRow } from './search-result-row'

const GROUP_LABELS: Record<SearchResultType, string> = {
  job: 'Jobs',
  resume: 'Résumés',
  coverLetter: 'Cover letters',
  persona: 'Personas',
  answer: 'Answers',
}

/** Shared by the listbox and by the combobox's `aria-activedescendant`. */
export const searchOptionId = (listboxId: string, index: number) => `${listboxId}-option-${index}`

function SearchLoading() {
  return (
    <div className="space-y-2 px-4 pb-4 pt-2" aria-hidden="true">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-4/5" />
      <Skeleton className="h-8 w-3/5" />
    </div>
  )
}

function SearchEmpty({ term }: { term: string }) {
  return (
    <p className="px-4 pb-6 pt-3 text-center text-sm text-muted-foreground">
      No matches for “{term}”.
    </p>
  )
}

export function SearchResults({
  results,
  loading,
  term,
  listboxId,
  activeIndex,
  onSelect,
}: {
  results: SearchResult[]
  loading: boolean
  term: string
  listboxId: string
  activeIndex: number
  onSelect: (result: SearchResult) => void
}) {
  if (results.length === 0) return loading ? <SearchLoading /> : <SearchEmpty term={term} />

  // One label per type, positioned by CSS `order` rather than by nesting, so the
  // DOM keeps the backend's ranking: `aria-activedescendant` traversal follows
  // rank while the rows read as grouped. The labels are decorative — each option
  // names its own type instead.
  const bands = new Map<SearchResultType, number>()
  for (const result of results) if (!bands.has(result.type)) bands.set(result.type, bands.size)
  const bandOf = (type: SearchResultType) => (bands.get(type) ?? 0) * 100

  return (
    <ul
      id={listboxId}
      role="listbox"
      aria-label="Search results"
      className="app-scroll flex max-h-[min(60vh,24rem)] flex-col overflow-y-auto px-2 pb-2"
    >
      {[...bands.keys()].map((type) => (
        <li
          key={type}
          aria-hidden="true"
          style={{ order: bandOf(type) }}
          className="px-2.5 pb-1 pt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground"
        >
          {GROUP_LABELS[type]}
        </li>
      ))}
      {results.map((result, index) => (
        <SearchResultRow
          key={`${result.type}:${result.id}`}
          result={result}
          id={searchOptionId(listboxId, index)}
          active={index === activeIndex}
          order={bandOf(result.type) + 1 + index}
          onSelect={() => onSelect(result)}
        />
      ))}
    </ul>
  )
}
