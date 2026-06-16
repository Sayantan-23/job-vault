'use client'

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { globalTimelineKey } from '@/lib/query-keys'
import type { GlobalTimelineEvent } from '@/types/timeline'
import type { Paginated } from '@/types/filters'

export const TIMELINE_PAGE_SIZE = 50

// The user-scoped global feed. `initialData` (from the server page) hydrates the
// first paint; paging keeps the previous page visible while the next loads.
export function useGlobalTimeline(page: number, initialData?: Paginated<GlobalTimelineEvent> | undefined) {
  return useQuery({
    queryKey: globalTimelineKey(page),
    queryFn: () =>
      apiClient.getPage<GlobalTimelineEvent>(`/api/timeline?page=${page}&limit=${TIMELINE_PAGE_SIZE}`),
    placeholderData: keepPreviousData,
    refetchOnMount: 'always',
    ...(initialData && page === 1 ? { initialData } : {}),
  })
}
