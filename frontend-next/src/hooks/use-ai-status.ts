'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { AI_STATUS_KEY } from '@/lib/query-keys'
import type { AiStatus } from '@/types/persona'

export function useAiStatus(initialData?: AiStatus) {
  return useQuery({
    queryKey: AI_STATUS_KEY,
    queryFn: () => apiClient.get<AiStatus>('/api/ai/status'),
    staleTime: 5 * 60 * 1000,
    ...(initialData ? { initialData } : {}),
  })
}
