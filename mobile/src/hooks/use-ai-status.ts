import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { aiStatusQuery } from '@/lib/queries';
import type { AiStatus } from '@/types/persona';

export function useAiStatus() {
  return useQuery({
    queryKey: aiStatusQuery.key,
    queryFn: () => apiClient.get<AiStatus>(aiStatusQuery.path),
    staleTime: 5 * 60 * 1000,
  });
}
