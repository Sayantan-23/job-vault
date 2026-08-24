'use client'

import { useMutation, useQuery, useQueryClient, keepPreviousData } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { DASHBOARD_KANBAN_KEY, DASHBOARD_STATS_KEY, JOBS_KEY } from '@/lib/query-keys'
import { kanbanQuery, statsQuery } from '@/lib/queries'
import type { KanbanBoard, DashboardStats } from '@/types/dashboard'
import type { GhostFilter } from '@/types/filters'
import type { JobStatus } from '@/lib/job-status'

export function useKanban(filters: { search: string; ghost: GhostFilter }, enabled = true) {
  const q = kanbanQuery(filters)
  return useQuery({
    queryKey: q.key,
    queryFn: () => apiClient.get<KanbanBoard>(q.path),
    // Only the Board view needs this query; gating it off on the List view avoids
    // a wasted /api/dashboard/kanban fetch on every list-view mount.
    enabled,
    placeholderData: keepPreviousData,
  })
}

export function useStats() {
  return useQuery({
    queryKey: statsQuery.key,
    queryFn: () => apiClient.get<DashboardStats>(statsQuery.path),
  })
}

export interface MoveJobVars {
  id: string
  status: JobStatus
  kanbanOrder: number
}

export function useMoveJob() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, kanbanOrder }: MoveJobVars) =>
      apiClient.patch(`/api/jobs/${id}/move`, { status, kanbanOrder }),
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: DASHBOARD_KANBAN_KEY })
      void qc.invalidateQueries({ queryKey: DASHBOARD_STATS_KEY })
      void qc.invalidateQueries({ queryKey: JOBS_KEY })
    },
  })
}
