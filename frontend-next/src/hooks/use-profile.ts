// frontend-next/src/hooks/use-profile.ts
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { PROFILE_KEY } from '@/lib/query-keys'
import { profileQuery } from '@/lib/queries'
import type { ProfileContent } from '@/types/profile'

export function useProfile() {
  return useQuery({
    queryKey: profileQuery.key,
    queryFn: () => apiClient.get<ProfileContent>(profileQuery.path),
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (content: ProfileContent) => apiClient.put<ProfileContent>('/api/profile', { content }),
    onSuccess: (data) => qc.setQueryData(PROFILE_KEY, data),
  })
}
