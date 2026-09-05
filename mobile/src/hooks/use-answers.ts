import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { ANSWERS_KEY } from '@/lib/query-keys';
import { answersQuery } from '@/lib/queries';
import type { Answer, AnswerBody, AnswerDraft, GenerateAnswerBody } from '@/types/answer';

export function useAnswers() {
  return useQuery({
    queryKey: answersQuery.key,
    queryFn: () => apiClient.get<Answer[]>(answersQuery.path),
  });
}

export function useCreateAnswer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: AnswerBody) => apiClient.post<Answer>('/api/answers', body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ANSWERS_KEY }),
  });
}

export function useUpdateAnswer(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<AnswerBody>) => apiClient.patch<Answer>(`/api/answers/${id}`, patch),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ANSWERS_KEY }),
  });
}

export function useDeleteAnswer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete<void>(`/api/answers/${id}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ANSWERS_KEY }),
  });
}

// Fire-and-forget on copy. It deliberately does NOT invalidate the list: the
// list is sorted by lastUsedAt, so invalidating would reorder rows under the
// user's pointer mid-touch. The new order appears on the next load.
export function useMarkAnswerUsed() {
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<{ id: string; lastUsedAt: string | null }>(`/api/answers/${id}/used`, {}),
  });
}

export function useGenerateAnswer() {
  return useMutation({
    mutationFn: (body: GenerateAnswerBody) => apiClient.post<AnswerDraft>('/api/answers/generate', body),
  });
}
