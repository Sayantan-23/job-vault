'use client'

import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { searchQuery } from '@/lib/queries'
import type { SearchResult } from '@/types/search'
import { useDebouncedValue } from './use-debounced-value'

// The debounce lives here, so every caller gets the same window and the query
// key only ever holds settled terms. Under 2 characters the query stays idle:
// the backend returns [] there anyway, so firing is pure noise.
export function useSearch(term: string) {
  const q = useDebouncedValue(term.trim(), 300)
  const desc = searchQuery(q)
  return useQuery({
    queryKey: desc.key,
    queryFn: () => apiClient.get<SearchResult[]>(desc.path),
    enabled: q.length >= 2,
    placeholderData: keepPreviousData,
  })
}
