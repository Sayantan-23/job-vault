'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { DASHBOARD_KANBAN_KEY, DASHBOARD_STATS_KEY, JOBS_KEY } from '@/lib/query-keys'
import type { KanbanBoard, DashboardStats } from '@/types/dashboard'
import type { JobStatus } from '@/lib/job-status'

export function useKanban(initialData?: KanbanBoard) {
  return useQuery({
    queryKey: DASHBOARD_KANBAN_KEY,
    queryFn: () => apiClient.get<KanbanBoard>('/api/dashboard/kanban'),
    refetchOnMount: 'always',
    ...(initialData ? { initialData } : {}),
  })
}

export function useStats(initialData?: DashboardStats) {
  return useQuery({
    queryKey: DASHBOARD_STATS_KEY,
    queryFn: () => apiClient.get<DashboardStats>('/api/dashboard/stats'),
    refetchOnMount: 'always',
    ...(initialData ? { initialData } : {}),
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
