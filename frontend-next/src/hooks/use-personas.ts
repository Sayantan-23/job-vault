'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { PERSONAS_KEY } from '@/lib/query-keys'
import type { Persona } from '@/types/persona'
import type { ResumeContent } from '@/types/resume'

interface CreatePersonaBody {
  name: string
  inputs: { pastedResume?: string; freeText?: string }
}

export function usePersonas(initialData?: Persona[]) {
  return useQuery({
    queryKey: PERSONAS_KEY,
    queryFn: () => apiClient.get<Persona[]>('/api/personas'),
    refetchOnMount: 'always',
    ...(initialData ? { initialData } : {}),
  })
}

export function useCreatePersona() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: CreatePersonaBody) => apiClient.post<Persona>('/api/personas', body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: PERSONAS_KEY }),
  })
}

export function useUpdatePersona(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: { name?: string; data?: ResumeContent }) => apiClient.patch<Persona>(`/api/personas/${id}`, patch),
    onSuccess: () => void qc.invalidateQueries({ queryKey: PERSONAS_KEY }),
  })
}

export function useDeletePersona() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/api/personas/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: PERSONAS_KEY }),
  })
}
