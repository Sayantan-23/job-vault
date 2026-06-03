'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { remindersKey } from '@/lib/query-keys'
import type { Reminder } from '@/types/reminder'

export interface CreateReminderValues {
  message: string
  remindAt: string
}

export interface UpdateReminderValues {
  message?: string
  remindAt?: string
  isCompleted?: boolean
}

export function useReminders(jobId: string) {
  return useQuery({
    queryKey: remindersKey(jobId),
    queryFn: () => apiClient.get<Reminder[]>(`/api/jobs/${jobId}/reminders`),
  })
}

export function useCreateReminder(jobId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (values: CreateReminderValues) =>
      apiClient.post<Reminder>(`/api/jobs/${jobId}/reminders`, values),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: remindersKey(jobId) })
    },
  })
}

export function useUpdateReminder(jobId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateReminderValues }) =>
      apiClient.patch<Reminder>(`/api/reminders/${id}`, patch),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: remindersKey(jobId) })
    },
  })
}

export function useDeleteReminder(jobId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<{ id: string }>(`/api/reminders/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: remindersKey(jobId) })
    },
  })
}
