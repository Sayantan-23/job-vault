'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { searchQuery } from '@/lib/queries'
import type { SearchResult } from '@/types/search'
import { useDebouncedValue } from './use-debounced-value'

// The debounce lives here, so every caller gets the same window and the query
// key only ever holds settled terms. Under 2 characters the query stays idle:
// the backend returns [] there anyway, so firing is pure noise.
//
// `settled` says whether `data` answers the term the caller is showing. It is
// derived here rather than left to callers because getting it wrong is silent:
// during the debounce window an empty `data` is the *previous* term's answer,
// and a caller that reads it as this term's answer renders "no matches" for a
// search that has not been made yet.
export function useSearch(term: string) {
  const trimmed = term.trim()
  const q = useDebouncedValue(trimmed, 300)
  const desc = searchQuery(q)
  const query = useQuery({
    queryKey: desc.key,
    queryFn: () => apiClient.get<SearchResult[]>(desc.path),
    enabled: q.length >= 2,
    placeholderData: keepPreviousData,
  })
  return { ...query, settled: q === trimmed }
}
