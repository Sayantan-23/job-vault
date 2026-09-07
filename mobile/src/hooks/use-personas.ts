import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { PERSONAS_KEY, personaKey } from '@/lib/query-keys';
import { personasQuery, personaQuery } from '@/lib/queries';
import type { Persona, CreatePersonaBody, UpdatePersonaBody } from '@/types/persona';

export function usePersonas() {
  return useQuery({
    queryKey: personasQuery.key,
    queryFn: () => apiClient.get<Persona[]>(personasQuery.path),
  });
}

export function usePersona(id: string) {
  return useQuery({
    queryKey: personaKey(id),
    queryFn: () => apiClient.get<Persona>(personaQuery(id).path),
    enabled: Boolean(id),
  });
}

export function useCreatePersona() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: CreatePersonaBody) => apiClient.post<Persona>('/api/personas', body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PERSONAS_KEY });
    },
  });
}

export function useUpdatePersona(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdatePersonaBody) =>
      apiClient.patch<Persona>(`/api/personas/${id}`, patch),
    onSuccess: (data) => {
      qc.setQueryData(personaKey(id), data);
      void qc.invalidateQueries({ queryKey: PERSONAS_KEY });
    },
  });
}

export function useDeletePersona() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/api/personas/${id}`),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: PERSONAS_KEY });
    },
  });
}
