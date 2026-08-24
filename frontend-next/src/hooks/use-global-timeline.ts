'use client'

import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { globalTimelineQuery, TIMELINE_PAGE_SIZE } from '@/lib/queries'
import type { GlobalTimelineEvent } from '@/types/timeline'

export { TIMELINE_PAGE_SIZE }

// The user-scoped global feed. Page 1 is SSR-prefetched and hydrated; paging
// keeps the previous page visible while the next loads.
export function useGlobalTimeline(page: number) {
  const q = globalTimelineQuery(page)
  return useQuery({
    queryKey: q.key,
    queryFn: () => apiClient.getPage<GlobalTimelineEvent>(q.path),
    placeholderData: keepPreviousData,
  })
}
