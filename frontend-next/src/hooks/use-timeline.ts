'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import {
  JOBS_KEY,
  jobKey,
  timelineKey,
  DASHBOARD_KANBAN_KEY,
  DASHBOARD_STATS_KEY,
} from '@/lib/query-keys'
import type { TimelineEvent } from '@/types/timeline'

export interface AddTimelineEntryValues {
  title: string
  description?: string
}

interface AddTimelineContext {
  previous: TimelineEvent[] | undefined
}

export function useTimeline(jobId: string | null) {
  return useQuery({
    queryKey: jobId ? timelineKey(jobId) : ['timeline', '__none__'],
    queryFn: () => apiClient.get<TimelineEvent[]>(`/api/jobs/${jobId}/timeline`),
    enabled: jobId !== null,
  })
}

export function useAddTimelineEntry(jobId: string) {
  const qc = useQueryClient()
  return useMutation<TimelineEvent, Error, AddTimelineEntryValues, AddTimelineContext>({
    mutationFn: (values: AddTimelineEntryValues) =>
      apiClient.post<TimelineEvent>(`/api/jobs/${jobId}/timeline`, values),
    // Optimistic prepend: cancel in-flight refetches, snapshot the list, and show
    // the note instantly. The synthesized event uses a temp id + the current
    // moment; the real row replaces it once the invalidate-on-settle refetch lands.
    onMutate: async (values) => {
      await qc.cancelQueries({ queryKey: timelineKey(jobId) })
      const previous = qc.getQueryData<TimelineEvent[]>(timelineKey(jobId))
      const optimistic: TimelineEvent = {
        id: `optimistic-${Date.now()}`,
        jobId,
        userId: '',
        type: 'MANUAL',
        title: values.title,
        description: values.description ?? null,
        createdAt: new Date().toISOString(),
      }
      qc.setQueryData<TimelineEvent[]>(timelineKey(jobId), (old) => [optimistic, ...(old ?? [])])
      return { previous }
    },
    onError: (_err, _values, context) => {
      if (context) qc.setQueryData(timelineKey(jobId), context.previous)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: timelineKey(jobId) })
      // A manual entry bumps the job's lastActivityAt, so refresh the job, the
      // list, and the dashboard (kanban + stats derive ghost-days live from it).
      void qc.invalidateQueries({ queryKey: jobKey(jobId) })
      void qc.invalidateQueries({ queryKey: JOBS_KEY })
      void qc.invalidateQueries({ queryKey: DASHBOARD_KANBAN_KEY })
      void qc.invalidateQueries({ queryKey: DASHBOARD_STATS_KEY })
    },
  })
}
