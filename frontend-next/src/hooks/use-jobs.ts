'use client'

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { JOBS_KEY, jobKey, jobsListKey, DASHBOARD_KANBAN_KEY, DASHBOARD_STATS_KEY } from '@/lib/query-keys'
import { buildListQuery } from '@/lib/filters'
import type { Job, ScrapeResult } from '@/types/job'
import type { JobFilters, Paginated } from '@/types/filters'
import type { ManualJobValues, UpdateJobValues } from '@/schemas/job'

export { JOBS_KEY, jobKey }

export function useJobs(filters: JobFilters, initialData?: Paginated<Job>) {
  return useQuery({
    queryKey: jobsListKey(filters),
    queryFn: () => apiClient.getPage<Job>(`/api/jobs${buildListQuery(filters)}`),
    // Keep showing the previous page while the next one loads (no empty flash on
    // paging/sorting/filtering).
    placeholderData: keepPreviousData,
    // Always refetch on mount: a server render that came back empty due to a
    // just-expired access token re-runs here and silently refreshes the session.
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
