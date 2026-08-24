'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { COVER_LETTERS_KEY } from '@/lib/query-keys'
import { coverLetterQuery, coverLettersByJobQuery, coverLettersQuery } from '@/lib/queries'
import type { CoverLetter, AdhocJob, RefineAction } from '@/types/cover-letter'

export interface GenerateBody {
  personaId: string
  jobId?: string
  job?: AdhocJob
  instructions?: string
}

export function useCoverLetters(jobId: string) {
  const q = coverLettersByJobQuery(jobId)
  return useQuery({
    queryKey: q.key,
    queryFn: () => apiClient.get<CoverLetter[]>(q.path),
    enabled: Boolean(jobId),
    // No SSR seed for the JobDrawer's per-job list — refetch whenever the drawer
    // opens so a letter edited on its own route shows up straight away.
    refetchOnMount: 'always',
  })
}

export function useAllCoverLetters() {
  return useQuery({
    queryKey: coverLettersQuery.key,
    queryFn: () => apiClient.get<CoverLetter[]>(coverLettersQuery.path),
  })
}

// Single letter for the dedicated editor route (SSR-prefetched and hydrated).
export function useCoverLetter(id: string) {
  const q = coverLetterQuery(id)
  return useQuery({
    queryKey: q.key,
    queryFn: () => apiClient.get<CoverLetter>(q.path),
    enabled: Boolean(id),
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
