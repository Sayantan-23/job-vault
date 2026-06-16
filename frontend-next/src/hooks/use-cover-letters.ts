'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { COVER_LETTERS_KEY, coverLetterKey, coverLettersByJobKey } from '@/lib/query-keys'
import type { CoverLetter, AdhocJob, RefineAction } from '@/types/cover-letter'

export interface GenerateBody {
  personaId: string
  jobId?: string
  job?: AdhocJob
  instructions?: string
}

export function useCoverLetters(jobId: string) {
  return useQuery({
    queryKey: coverLettersByJobKey(jobId),
    queryFn: () => apiClient.get<CoverLetter[]>(`/api/cover-letters?jobId=${jobId}`),
    enabled: Boolean(jobId),
    refetchOnMount: 'always',
  })
}

export function useAllCoverLetters(initialData?: CoverLetter[]) {
  return useQuery({
    queryKey: COVER_LETTERS_KEY,
    queryFn: () => apiClient.get<CoverLetter[]>('/api/cover-letters'),
    // SSR-hydrated; treat as fresh on mount so we don't clobber it with an
    // immediate refetch. Mutations (generate/update/delete) still invalidate.
    staleTime: 30_000,
    ...(initialData ? { initialData } : {}),
  })
}

// Single letter for the dedicated editor route. SSR-hydrated via initialData;
// refetches on mount so an edit made elsewhere shows the latest.
export function useCoverLetter(id: string, initialData?: CoverLetter) {
  return useQuery({
    queryKey: coverLetterKey(id),
    queryFn: () => apiClient.get<CoverLetter>(`/api/cover-letters/${id}`),
    enabled: Boolean(id),
    refetchOnMount: 'always',
    ...(initialData ? { initialData } : {}),
  })
}

export function useGenerateCoverLetter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: GenerateBody) => apiClient.post<CoverLetter>('/api/cover-letters', body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: COVER_LETTERS_KEY }),
  })
}

export function useUpdateCoverLetter(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: { title?: string; bodyMarkdown?: string }) =>
      apiClient.patch<CoverLetter>(`/api/cover-letters/${id}`, patch),
    onSuccess: () => void qc.invalidateQueries({ queryKey: COVER_LETTERS_KEY }),
  })
}

export function useRefineCoverLetter(id: string) {
  return useMutation({
    mutationFn: (body: { action: RefineAction; instructions?: string }) =>
      apiClient.post<{ bodyMarkdown: string }>(`/api/cover-letters/${id}/refine`, body),
  })
}

export function useDeleteCoverLetter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/api/cover-letters/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: COVER_LETTERS_KEY }),
  })
}
