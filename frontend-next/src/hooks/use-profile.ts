// frontend-next/src/hooks/use-profile.ts
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { PROFILE_KEY } from '@/lib/query-keys'
import type { ProfileContent } from '@/types/profile'

export function useProfile(initialData?: ProfileContent) {
  return useQuery({
    queryKey: PROFILE_KEY,
    queryFn: () => apiClient.get<ProfileContent>('/api/profile'),
    staleTime: 30_000,
    ...(initialData ? { initialData } : {}),
  })
}

export function useUpdateProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (content: ProfileContent) => apiClient.put<ProfileContent>('/api/profile', { content }),
    onSuccess: (data) => qc.setQueryData(PROFILE_KEY, data),
  })
}
