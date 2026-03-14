import type { ApiResponse } from '~/types/api';
import type {
  JobCard,
  KanbanBoardData,
  MoveJobPayload,
  MoveJobRequest,
  Job,
} from '~/types/job';

/**
 * Manages kanban board data: fetching columns, moving jobs via drag-and-drop
 * with optimistic updates (handled by vue-draggable-plus) and rollback on API failure.
 */
export function useJobs() {
  const kanbanData = useState<KanbanBoardData | null>('kanban-data', () => null);
  const isLoading = useState<boolean>('kanban-loading', () => false);

  const api = useApi();
  const toast = useToastNotify();

  /**
   * Fetch the full kanban board data from the API.
   */
  async function fetchKanban(): Promise<void> {
    isLoading.value = true;
    try {
      const response = await api.get<ApiResponse<KanbanBoardData>>('/dashboard/kanban');
      kanbanData.value = response.data;
    } catch {
      // Error toast handled by useApi
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Calculate the new kanban order for inserting a card at a given index within a column.
   * Uses float-based positioning (midpoint between neighbors).
   *
   * @param siblings - The other cards in the target column (excluding the moved card)
   * @param newIndex - The insertion index in the target column
   */
  function calculateNewOrder(siblings: JobCard[], newIndex: number): number {
    if (siblings.length === 0) {
      return 1;
    }

    if (newIndex === 0) {
      // Insert before the first item
      return siblings[0].kanbanOrder / 2;
    }

    if (newIndex >= siblings.length) {
      // Insert after the last item
      return siblings[siblings.length - 1].kanbanOrder + 1;
    }

    // Insert between two items: midpoint
    const before = siblings[newIndex - 1].kanbanOrder;
    const after = siblings[newIndex].kanbanOrder;
    return (before + after) / 2;
  }

  /**
   * Move a job to a new status/position.
   * vue-draggable-plus has already mutated the column arrays (optimistic).
   * This function only handles the API call and rollback on failure.
   */
  async function moveJob(payload: MoveJobPayload): Promise<void> {
    if (!kanbanData.value) return;

    try {
      const body: MoveJobRequest = {
        status: payload.newStatus,
        kanbanOrder: payload.newOrder,
      };
      await api.patch<ApiResponse<Job>>(`/jobs/${payload.jobId}/move`, body);

      // Update local card data to reflect new status and order
      for (const col of kanbanData.value.columns) {
        const card = col.jobs.find((j) => j.id === payload.jobId);
        if (card) {
          card.status = payload.newStatus;
          card.kanbanOrder = payload.newOrder;
          break;
        }
      }
    } catch {
      // API failed — rollback by refetching the entire board
      toast.error('Failed to move job. Reverting to last known state.');
      await fetchKanban();
    }
  }

  /**
   * Refresh kanban data after a new job is created or updated.
   */
  async function refreshAfterJobChange(): Promise<void> {
    await fetchKanban();
  }

  return {
    kanbanData,
    isLoading,
    fetchKanban,
    moveJob,
    calculateNewOrder,
    refreshAfterJobChange,
  };
}
