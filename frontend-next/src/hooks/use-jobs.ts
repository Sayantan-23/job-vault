'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { JOBS_KEY, jobKey, DASHBOARD_KANBAN_KEY, DASHBOARD_STATS_KEY } from '@/lib/query-keys'
import type { Job, ScrapeResult } from '@/types/job'
import type { ManualJobValues, UpdateJobValues } from '@/schemas/job'

export { JOBS_KEY, jobKey }

export function useJobs(initialData?: Job[]) {
  return useQuery({
    queryKey: JOBS_KEY,
    queryFn: () => apiClient.get<Job[]>('/api/jobs'),
    // Always refetch on mount: if the server-rendered list came back empty
    // because the access token had just expired, this client fetch re-runs,
    // silently refreshes the session (via the api-client), and shows live data.
    refetchOnMount: 'always',
    ...(initialData ? { initialData } : {}),
  })
}

export function useJob(id: string | null) {
  return useQuery({
    queryKey: id ? jobKey(id) : ['jobs', '__none__'],
    queryFn: () => apiClient.get<Job>(`/api/jobs/${id}`),
    enabled: id !== null,
  })
}

export function useCreateJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (values: ManualJobValues) => apiClient.post<Job>('/api/jobs', values),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: JOBS_KEY })
      void qc.invalidateQueries({ queryKey: DASHBOARD_KANBAN_KEY })
      void qc.invalidateQueries({ queryKey: DASHBOARD_STATS_KEY })
    },
  })
}

export function useScrapeJob() {
  return useMutation({
    mutationFn: (sourceUrl: string) => apiClient.post<ScrapeResult>('/api/jobs/scrape', { sourceUrl }),
  })
}

export function useUpdateJob(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (values: UpdateJobValues) => apiClient.patch<Job>(`/api/jobs/${id}`, values),
    onSuccess: (job) => {
      qc.setQueryData(jobKey(id), job)
      void qc.invalidateQueries({ queryKey: JOBS_KEY })
      void qc.invalidateQueries({ queryKey: DASHBOARD_KANBAN_KEY })
      void qc.invalidateQueries({ queryKey: DASHBOARD_STATS_KEY })
    },
  })
}

export function useDeleteJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<{ message: string }>(`/api/jobs/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: JOBS_KEY })
      void qc.invalidateQueries({ queryKey: DASHBOARD_KANBAN_KEY })
      void qc.invalidateQueries({ queryKey: DASHBOARD_STATS_KEY })
    },
  })
}
