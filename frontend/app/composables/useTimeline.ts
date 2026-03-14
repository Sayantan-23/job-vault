import type { TimelineEvent, CreateTimelineEventRequest } from '~/types/timeline';
import type { ApiResponse } from '~/types/api';

/**
 * Per-job timeline composable.
 * Fetches and creates timeline events for a specific job.
 */
export function useTimeline(jobId: MaybeRef<string>) {
  const events = ref<TimelineEvent[]>([]);
  const isLoading = ref(false);
  const api = useApi();
  const toast = useToastNotify();

  const resolvedJobId = computed(() => toValue(jobId));

  async function fetchTimeline(): Promise<void> {
    isLoading.value = true;
    try {
      const response = await api.get<ApiResponse<TimelineEvent[]>>(
        `/jobs/${resolvedJobId.value}/timeline`,
      );
      events.value = response.data;
    } catch {
      toast.error('Failed to load timeline.');
    } finally {
      isLoading.value = false;
    }
  }

  async function addEntry(data: CreateTimelineEventRequest): Promise<TimelineEvent | null> {
    try {
      const response = await api.post<ApiResponse<TimelineEvent>>(
        `/jobs/${resolvedJobId.value}/timeline`,
        data,
      );
      // Prepend new event to top of list (most recent first)
      events.value.unshift(response.data);
      toast.success('Timeline entry added.');
      return response.data;
    } catch {
      toast.error('Failed to add timeline entry.');
      return null;
    }
  }

  return { events, isLoading, fetchTimeline, addEntry };
}
