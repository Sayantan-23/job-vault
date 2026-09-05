import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { kanbanQuery } from '@/lib/queries';
import type { KanbanBoardResponse } from '@/types/kanban';

export function useKanban(
  filters?: { search?: string; ghost?: string },
  enabled = true
) {
  const q = kanbanQuery(filters);
  return useQuery({
    queryKey: q.key,
    queryFn: () => apiClient.get<KanbanBoardResponse>(q.path),
    enabled,
    placeholderData: keepPreviousData,
  });
}
