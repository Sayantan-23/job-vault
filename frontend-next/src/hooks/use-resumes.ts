'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient } from '@/lib/api-client'
import { RESUMES_KEY } from '@/lib/query-keys'
import { resumesQuery } from '@/lib/queries'
import type { GeneratedResume, ResumeContent } from '@/types/resume'

interface GenerateBody {
  personaId: string
  jobId?: string
  instructions?: string
}

export function useResumes(jobId?: string) {
  const q = resumesQuery(jobId)
  return useQuery({
    queryKey: q.key,
    queryFn: () => apiClient.get<GeneratedResume[]>(q.path),
  })
}

export function useGenerateResume() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: GenerateBody) => apiClient.post<GeneratedResume>('/api/resumes', body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: RESUMES_KEY }),
  })
}

export function useUpdateResume(id: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (patch: { title?: string; content?: ResumeContent }) =>
      apiClient.patch<GeneratedResume>(`/api/resumes/${id}`, patch),
    onSuccess: () => void qc.invalidateQueries({ queryKey: RESUMES_KEY }),
  })
}

export function useDeleteResume() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/api/resumes/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: RESUMES_KEY }),
  })
}

export function fetchResumeTex(id: string): Promise<{ tex: string }> {
  return apiClient.get<{ tex: string }>(`/api/resumes/${id}/tex`)
}
