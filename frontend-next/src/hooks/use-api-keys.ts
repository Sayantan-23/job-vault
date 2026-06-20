'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { API_KEYS_KEY } from '@/lib/query-keys'
import type { ConnectedApp, CreatedApiKey } from '@/types/extension'

export function useApiKeys() {
  return useQuery({
    queryKey: API_KEYS_KEY,
    queryFn: () => apiClient.get<ConnectedApp[]>('/api/api-keys'),
  })
}

export function useCreateApiKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => apiClient.post<CreatedApiKey>('/api/api-keys', { name }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: API_KEYS_KEY }),
  })
}

export function useRevokeApiKey() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/api/api-keys/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: API_KEYS_KEY }),
  })
}
