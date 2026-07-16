'use client'

import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { contactsKey, JOBS_KEY, DASHBOARD_KANBAN_KEY, timelineKey } from '@/lib/query-keys'
import type { JobContact, ContactChannel, ContactStatus } from '@/types/contact'

export interface CreateContactValues {
  contact: string
  channel?: ContactChannel
  reachedOutAt?: string
  notes?: string
}

export interface UpdateContactValues {
  contact?: string
  channel?: ContactChannel | null
  status?: ContactStatus
  reachedOutAt?: string
  notes?: string | null
}

// Contacts feed the list/board outreach badges, so every mutation refreshes
// the jobs + kanban caches alongside the drawer's contact list. Create and
// status changes also emit backend timeline auto-events, so refresh the job's
// timeline to keep the drawer's Timeline section in sync while it's open.
function invalidateContactCaches(qc: QueryClient, jobId: string): void {
  void qc.invalidateQueries({ queryKey: contactsKey(jobId) })
  void qc.invalidateQueries({ queryKey: JOBS_KEY })
  void qc.invalidateQueries({ queryKey: DASHBOARD_KANBAN_KEY })
  void qc.invalidateQueries({ queryKey: timelineKey(jobId) })
}

export function useContacts(jobId: string) {
  return useQuery({
    queryKey: contactsKey(jobId),
    queryFn: () => apiClient.get<JobContact[]>(`/api/jobs/${jobId}/contacts`),
  })
}

export function useCreateContact(jobId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (values: CreateContactValues) =>
      apiClient.post<JobContact>(`/api/jobs/${jobId}/contacts`, values),
    onSuccess: () => invalidateContactCaches(qc, jobId),
  })
}

export function useUpdateContact(jobId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateContactValues }) =>
      apiClient.patch<JobContact>(`/api/contacts/${id}`, patch),
    onSuccess: () => invalidateContactCaches(qc, jobId),
  })
}

export function useDeleteContact(jobId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<{ id: string }>(`/api/contacts/${id}`),
    onSuccess: () => invalidateContactCaches(qc, jobId),
  })
}
