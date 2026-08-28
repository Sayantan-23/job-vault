'use client'

import { Fragment } from 'react'
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

/**
 * Rank-ordered hits → grouped-by-type, groups ordered by their best-ranked
 * member, rows inside a group still in rank order. The palette traverses this
 * array, so DOM order, visible order and traversal order are the same order —
 * ArrowDown walks straight down the list instead of jumping between groups.
 * A `Map` keyed by type preserves first-insertion order, which is exactly
 * "ordered by best hit" for a rank-sorted input.
 */
export function groupByType(results: SearchResult[]): SearchResult[] {
  const groups = new Map<SearchResultType, SearchResult[]>()
  for (const result of results) {
    const group = groups.get(result.type)
    if (group) group.push(result)
    else groups.set(result.type, [result])
  }
  return [...groups.values()].flat()
}

// Loading and empty both live *inside* the listbox: `aria-controls` on the
// combobox has to resolve to a real element in every state, and a listbox with
// no options is valid where a dangling IDREF is not.
function SearchLoading() {
  return (
    <li className="space-y-2 px-2 pb-2 pt-2" aria-hidden="true">
      <Skeleton className="h-8 w-full" />
      <Skeleton className="h-8 w-4/5" />
      <Skeleton className="h-8 w-3/5" />
    </li>
  )
}

function SearchEmpty({ term }: { term: string }) {
  return (
    <li className="px-2 pb-4 pt-3 text-center text-sm text-muted-foreground">
      No matches for “{term}”.
    </li>
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
  return (
    <ul
      id={listboxId}
      role="listbox"
      aria-label="Search results"
      className="app-scroll max-h-[min(60vh,24rem)] overflow-y-auto px-2 pb-2"
    >
      {results.length === 0 ? (
        loading ? (
          <SearchLoading />
        ) : (
          <SearchEmpty term={term} />
        )
      ) : null}
      {/* `results` arrives grouped (groupByType), so a type change marks the start
          of a group. The labels are decorative — each option names its own type. */}
      {results.map((result, index) => (
        <Fragment key={`${result.type}:${result.id}`}>
          {result.type === results[index - 1]?.type ? null : (
            <li
              aria-hidden="true"
              className="px-2.5 pb-1 pt-3 font-mono text-[11px] uppercase tracking-[0.08em] text-muted-foreground"
            >
              {GROUP_LABELS[result.type]}
            </li>
          )}
          <SearchResultRow
            result={result}
            id={searchOptionId(listboxId, index)}
            active={index === activeIndex}
            onSelect={() => onSelect(result)}
          />
        </Fragment>
      ))}
    </ul>
  )
}
