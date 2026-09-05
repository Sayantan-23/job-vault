import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { personasQuery } from '@/lib/queries';
import type { Persona } from '@/types/persona';

export function usePersonas() {
  return useQuery({
    queryKey: personasQuery.key,
    queryFn: () => apiClient.get<Persona[]>(personasQuery.path),
  });
}
