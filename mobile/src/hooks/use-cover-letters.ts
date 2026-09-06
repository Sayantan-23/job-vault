import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { apiClient } from '@/lib/api-client';
import { coverLetterQuery, coverLettersByJobQuery, coverLettersQuery } from '@/lib/queries';
import { COVER_LETTERS_KEY } from '@/lib/query-keys';
import type {
  CoverLetter,
  GenerateCoverLetterBody,
  RefineAction,
  UpdateCoverLetterBody,
} from '@/types/cover-letter';

export function useCoverLetters(jobId: string) {
  const q = coverLettersByJobQuery(jobId);
  return useQuery({
    queryKey: q.key,
    queryFn: () => apiClient.get<CoverLetter[]>(q.path),
    enabled: Boolean(jobId),
  });
}

export function useAllCoverLetters() {
  return useQuery({
    queryKey: coverLettersQuery.key,
    queryFn: () => apiClient.get<CoverLetter[]>(coverLettersQuery.path),
  });
}

export function useCoverLetter(id: string) {
  const q = coverLetterQuery(id);
  return useQuery({
    queryKey: q.key,
    queryFn: () => apiClient.get<CoverLetter>(q.path),
    enabled: Boolean(id),
  });
}

export function useGenerateCoverLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: GenerateCoverLetterBody) =>
      apiClient.post<CoverLetter>('/api/cover-letters', body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: COVER_LETTERS_KEY }),
  });
}

export function useUpdateCoverLetter(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: UpdateCoverLetterBody) =>
      apiClient.patch<CoverLetter>(`/api/cover-letters/${id}`, patch),
    onSuccess: () => void qc.invalidateQueries({ queryKey: COVER_LETTERS_KEY }),
  });
}

export function useRefineCoverLetter(id: string) {
  return useMutation({
    mutationFn: (body: { action: RefineAction; instructions?: string }) =>
      apiClient.post<{ bodyMarkdown: string }>(`/api/cover-letters/${id}/refine`, body),
  });
}

export function useDeleteCoverLetter() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/api/cover-letters/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: COVER_LETTERS_KEY }),
  });
}
