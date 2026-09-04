import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/lib/api-client'
import { remindersKey } from '@/lib/query-keys'
import type { Reminder } from '@/types/reminder'

// Read-only port of the web's useReminders (frontend-next/src/hooks/use-reminders.ts:19).
// C3 surfaces the list on the detail screen only — no create/edit/delete.
export function useJobReminders(jobId: string) {
  return useQuery({
    queryKey: remindersKey(jobId),
    queryFn: () => apiClient.get<Reminder[]>(`/api/jobs/${jobId}/reminders`),
  })
}
