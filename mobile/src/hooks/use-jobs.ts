import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'

import { apiClient } from '@/lib/api-client'
import { JOBS_KEY, jobKey, jobsInfiniteKey } from '@/lib/query-keys'
import { jobsListQuery } from '@/lib/queries'
import type { Job, UpdateJobValues } from '@/types/job'
import type { JobFilters } from '@/types/filters'

export { JOBS_KEY, jobKey }


export function useInfiniteJobs(filters: Omit<JobFilters, 'page'>) {
  return useInfiniteQuery({
    queryKey: jobsInfiniteKey(filters),
    initialPageParam: 1 as number,
    queryFn: ({ pageParam = 1 }) =>
      apiClient.getPage<Job>(
        jobsListQuery({ ...filters, page: pageParam, limit: 30 }).path,
      ),
    getNextPageParam: (last) =>
      last.meta.page < last.meta.totalPages ? last.meta.page + 1 : undefined,
    // Keep the previous filter set's rows visible while the new set loads — no
    // empty flash on filtering/sorting.
    placeholderData: keepPreviousData,
    select: (data) => data.pages.flatMap((p) => p.data),
  })
}

export function useJob(id: string | null) {
  return useQuery({
    queryKey: id ? jobKey(id) : ['jobs', '__none__'],
    queryFn: () => apiClient.get<Job>(`/api/jobs/${id}`),
    enabled: id !== null,
  })
}

export function useUpdateJob(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (values: UpdateJobValues) =>
      apiClient.patch<Job>(`/api/jobs/${id}`, values),
    onSuccess: (job) => {
      qc.setQueryData(jobKey(id), job)
      void qc.invalidateQueries({ queryKey: JOBS_KEY })
    },
  })
}

export function useDeleteJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete<{ message: string }>(`/api/jobs/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: JOBS_KEY })
    },
  })
}
