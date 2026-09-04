import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/lib/api-client'
import { timelineKey } from '@/lib/query-keys'
import type { TimelineEvent } from '@/types/timeline'

// Read-only port of the web's useTimeline (frontend-next/src/hooks/use-timeline.ts:23).
// C3 surfaces the feed on the detail screen only — no add/edit/delete.
export function useJobTimeline(jobId: string) {
  return useQuery({
    queryKey: timelineKey(jobId),
    queryFn: () => apiClient.get<TimelineEvent[]>(`/api/jobs/${jobId}/timeline`),
  })
}
