'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { PERSONAS_KEY } from '@/lib/query-keys'
import { personasQuery } from '@/lib/queries'
import type { Persona, ParsedResume } from '@/types/persona'
import type { ProfileContent } from '@/types/profile'

interface CreatePersonaBody {
  name: string
  data: ProfileContent
  rawInput?: string | null
}

export function usePersonas() {
  return useQuery({
    queryKey: personasQuery.key,
    queryFn: () => apiClient.get<Persona[]>(personasQuery.path),
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
    mutationFn: (patch: { name?: string; data?: ProfileContent }) => apiClient.patch<Persona>(`/api/personas/${id}`, patch),
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

// The only AI persona path: text and/or PDF → structured ProfileContent for
// review. Multipart (FormData) because of the optional PDF upload.
export function useParseResume() {
  return useMutation({
    mutationFn: ({ text, file }: { text?: string | undefined; file?: File | undefined }) => {
      const fd = new FormData()
      if (file) fd.append('file', file)
      if (text) fd.append('text', text)
      return apiClient.postForm<ParsedResume>('/api/personas/parse-resume', fd)
    },
  })
}
