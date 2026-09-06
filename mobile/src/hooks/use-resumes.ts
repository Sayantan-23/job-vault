import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { resumeQuery, resumesQuery } from '@/lib/queries';
import { RESUMES_KEY } from '@/lib/query-keys';
import type { GeneratedResume } from '@/types/resume';

export function useResumes(jobId?: string) {
  const q = resumesQuery(jobId);
  return useQuery({
    queryKey: q.key,
    queryFn: () => apiClient.get<GeneratedResume[]>(q.path),
  });
}

export function useResume(id: string) {
  const q = resumeQuery(id);
  return useQuery({
    queryKey: q.key,
    queryFn: () => apiClient.get<GeneratedResume>(q.path),
    enabled: Boolean(id),
  });
}

export function useDeleteResume() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/api/resumes/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: RESUMES_KEY }),
  });
}

export function useUpdateResume(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { title?: string }) =>
      apiClient.patch<GeneratedResume>(`/api/resumes/${id}`, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: resumeQuery(id).key });
      void qc.invalidateQueries({ queryKey: RESUMES_KEY });
    },
  });
}

