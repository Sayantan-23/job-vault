<script setup lang="ts">
import type { Reminder } from '~/types/reminder';

interface ReminderListProps {
  jobId: string;
}

const props = defineProps<ReminderListProps>();

const { reminders, isLoading, upcoming, completed, fetchReminders } = useReminders(props.jobId);

// Fetch on mount
onMounted(() => {
  fetchReminders();
});

// Re-fetch when jobId changes
watch(
  () => props.jobId,
  () => {
    fetchReminders();
  },
);

function onReminderUpdated(updatedReminder: Reminder) {
  const index = reminders.value.findIndex((r) => r.id === updatedReminder.id);
  if (index !== -1) {
    reminders.value[index] = updatedReminder;
  }
}

function onReminderDeleted(id: string) {
  reminders.value = reminders.value.filter((r) => r.id !== id);
}

function onReminderCreated(reminder: Reminder) {
  reminders.value.push(reminder);
}
</script>

<template>
  <div class="space-y-4">
    <!-- Add reminder form -->
    <ReminderAddForm :job-id="props.jobId" @created="onReminderCreated" />

    <!-- Loading state -->
    <div v-if="isLoading && upcoming.length === 0 && completed.length === 0" class="flex justify-center py-6">
      <UiLoadingSpinner />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!isLoading && upcoming.length === 0 && completed.length === 0"
      class="py-6 text-center"
    >
      <UIcon name="i-lucide-bell-off" class="mx-auto mb-2 size-8 text-dimmed" />
      <p class="text-sm text-dimmed">No reminders yet</p>
      <p class="text-xs text-dimmed mt-0.5">Add a reminder to stay on track</p>
    </div>

    <!-- Content -->
    <template v-else>
      <!-- Upcoming reminders -->
      <div v-if="upcoming.length > 0" class="space-y-2">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-muted">
          Upcoming ({{ upcoming.length }})
        </h4>
        <div class="space-y-2">
          <ReminderItem
            v-for="reminder in upcoming"
            :key="reminder.id"
            :reminder="reminder"
            @updated="onReminderUpdated"
            @deleted="onReminderDeleted"
          />
        </div>
      </div>

      <!-- Completed reminders -->
      <div v-if="completed.length > 0" class="space-y-2">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-muted">
          Completed ({{ completed.length }})
        </h4>
        <div class="space-y-2">
          <ReminderItem
            v-for="reminder in completed"
            :key="reminder.id"
            :reminder="reminder"
            @updated="onReminderUpdated"
            @deleted="onReminderDeleted"
          />
        </div>
      </div>
    </template>
  </div>
</template>
