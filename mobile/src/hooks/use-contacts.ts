import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/lib/api-client'
import { contactsKey } from '@/lib/query-keys'
import type { JobContact } from '@/types/contact'

// Read-only port of the web's useContacts (frontend-next/src/hooks/use-contacts.ts:34).
// C3 surfaces the contact list on the detail screen only — no create/edit/delete,
// those stay on the web until a later mobile slice owns their UI.
export function useJobContacts(jobId: string) {
  return useQuery({
    queryKey: contactsKey(jobId),
    queryFn: () => apiClient.get<JobContact[]>(`/api/jobs/${jobId}/contacts`),
  })
}
