import type { Reminder, CreateReminderRequest, UpdateReminderRequest } from '~/types/reminder';
import type { ApiResponse } from '~/types/api';

/**
 * Per-job reminder composable.
 * Provides CRUD operations and computed upcoming/completed lists.
 */
export function useReminders(jobId: MaybeRef<string>) {
  const reminders = ref<Reminder[]>([]);
  const isLoading = ref(false);
  const api = useApi();
  const toast = useToastNotify();

  const resolvedJobId = computed(() => toValue(jobId));

  const upcoming = computed(() =>
    reminders.value
      .filter((r) => !r.isCompleted)
      .sort((a, b) => new Date(a.remindAt).getTime() - new Date(b.remindAt).getTime()),
  );

  const completed = computed(() =>
    reminders.value
      .filter((r) => r.isCompleted)
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
  );

  async function fetchReminders(): Promise<void> {
    isLoading.value = true;
    try {
      const response = await api.get<ApiResponse<Reminder[]>>(
        `/jobs/${resolvedJobId.value}/reminders`,
      );
      reminders.value = response.data;
    } catch {
      toast.error('Failed to load reminders.');
    } finally {
      isLoading.value = false;
    }
  }

  async function addReminder(data: CreateReminderRequest): Promise<Reminder | null> {
    try {
      const response = await api.post<ApiResponse<Reminder>>(
        `/jobs/${resolvedJobId.value}/reminders`,
        data,
      );
      reminders.value.push(response.data);
      toast.success('Reminder created.');
      return response.data;
    } catch {
      toast.error('Failed to create reminder.');
      return null;
    }
  }

  async function updateReminder(id: string, data: UpdateReminderRequest): Promise<Reminder | null> {
    try {
      const response = await api.patch<ApiResponse<Reminder>>(
        `/reminders/${id}`,
        data,
      );
      const index = reminders.value.findIndex((r) => r.id === id);
      if (index !== -1) {
        reminders.value[index] = response.data;
      }
      return response.data;
    } catch {
      toast.error('Failed to update reminder.');
      return null;
    }
  }

  async function deleteReminder(id: string): Promise<boolean> {
    try {
      await api.delete(`/reminders/${id}`);
      reminders.value = reminders.value.filter((r) => r.id !== id);
      toast.success('Reminder deleted.');
      return true;
    } catch {
      toast.error('Failed to delete reminder.');
      return false;
    }
  }

  return {
    reminders,
    isLoading,
    upcoming,
    completed,
    fetchReminders,
    addReminder,
    updateReminder,
    deleteReminder,
  };
}
