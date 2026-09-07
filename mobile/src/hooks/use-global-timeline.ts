import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { globalTimelineQuery, TIMELINE_PAGE_SIZE } from '@/lib/queries';
import type { GlobalTimelineEvent } from '@/types/timeline';

export { TIMELINE_PAGE_SIZE };

export function useGlobalTimeline(page = 1) {
  const q = globalTimelineQuery(page);
  return useQuery({
    queryKey: q.key,
    queryFn: () => apiClient.getPage<GlobalTimelineEvent>(q.path),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}
