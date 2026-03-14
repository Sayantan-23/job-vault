<script setup lang="ts">
import type { Reminder, UpdateReminderRequest } from '~/types/reminder';
import type { ApiResponse } from '~/types/api';

interface ReminderItemProps {
  reminder: Reminder;
}

const props = defineProps<ReminderItemProps>();

const emit = defineEmits<{
  updated: [reminder: Reminder];
  deleted: [id: string];
}>();

const api = useApi();
const toast = useToastNotify();

const isEditing = ref(false);
const editMessage = ref('');
const editRemindAt = ref('');
const isUpdating = ref(false);
const isDeleting = ref(false);

const isOverdue = computed(() => {
  if (props.reminder.isCompleted) return false;
  return new Date(props.reminder.remindAt) < new Date();
});

const formattedDate = computed(() => formatDateTime(props.reminder.remindAt));
const relativeDate = computed(() => formatRelativeTime(props.reminder.remindAt));

async function onToggleComplete() {
  isUpdating.value = true;
  try {
    const response = await api.patch<ApiResponse<Reminder>>(
      `/reminders/${props.reminder.id}`,
      { isCompleted: !props.reminder.isCompleted },
    );
    emit('updated', response.data);
  } catch {
    toast.error('Failed to update reminder.');
  } finally {
    isUpdating.value = false;
  }
}

function onStartEdit() {
  isEditing.value = true;
  editMessage.value = props.reminder.message;
  // Format date for datetime-local input
  const d = new Date(props.reminder.remindAt);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  editRemindAt.value = local.toISOString().slice(0, 16);
}

function onCancelEdit() {
  isEditing.value = false;
}

async function onSaveEdit() {
  if (!editMessage.value.trim()) return;

  isUpdating.value = true;
  try {
    const data: UpdateReminderRequest = {
      message: editMessage.value.trim(),
      remindAt: new Date(editRemindAt.value).toISOString(),
    };
    const response = await api.patch<ApiResponse<Reminder>>(
      `/reminders/${props.reminder.id}`,
      data,
    );
    isEditing.value = false;
    emit('updated', response.data);
  } catch {
    toast.error('Failed to update reminder.');
  } finally {
    isUpdating.value = false;
  }
}

async function onDelete() {
  isDeleting.value = true;
  try {
    await api.delete(`/reminders/${props.reminder.id}`);
    toast.success('Reminder deleted.');
    emit('deleted', props.reminder.id);
  } catch {
    toast.error('Failed to delete reminder.');
  } finally {
    isDeleting.value = false;
  }
}
</script>

<template>
  <div
    class="group rounded-lg border p-3 transition-all duration-200"
    :class="[
      props.reminder.isCompleted
        ? 'border-gray-200/30 dark:border-gray-700/20 bg-muted/30'
        : isOverdue
          ? 'border-red-300/50 dark:border-red-700/30 bg-red-50/30 dark:bg-red-950/10'
          : 'border-gray-200/50 dark:border-gray-700/50 bg-white/40 dark:bg-gray-800/40',
    ]"
  >
    <!-- Edit mode -->
    <div v-if="isEditing" class="space-y-2">
      <UInput
        v-model="editMessage"
        placeholder="Reminder message..."
        size="sm"
        autofocus
      />
      <input
        v-model="editRemindAt"
        type="datetime-local"
        class="w-full rounded-md border border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 px-2.5 py-1.5 text-sm text-default focus:outline-none focus:ring-2 focus:ring-primary/40"
      />
      <div class="flex justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          size="xs"
          @click="onCancelEdit"
        />
        <UButton
          label="Save"
          color="primary"
          size="xs"
          :loading="isUpdating"
          :disabled="!editMessage.trim()"
          @click="onSaveEdit"
        />
      </div>
    </div>

    <!-- Display mode -->
    <div v-else class="flex items-start gap-3">
      <!-- Checkbox -->
      <UCheckbox
        :model-value="props.reminder.isCompleted"
        :disabled="isUpdating"
        class="mt-0.5"
        @update:model-value="onToggleComplete"
      />

      <!-- Content -->
      <div class="min-w-0 flex-1">
        <p
          class="text-sm"
          :class="[
            props.reminder.isCompleted
              ? 'line-through text-dimmed'
              : 'text-default',
          ]"
        >
          {{ props.reminder.message }}
        </p>
        <div class="mt-1 flex items-center gap-1.5">
          <UIcon
            name="i-lucide-clock"
            class="size-3"
            :class="isOverdue ? 'text-error' : 'text-dimmed'"
          />
          <span
            class="text-xs"
            :class="isOverdue ? 'text-error font-medium' : 'text-dimmed'"
            :title="formattedDate"
          >
            {{ isOverdue ? 'Overdue: ' : '' }}{{ relativeDate }}
          </span>
        </div>
      </div>

      <!-- Actions (visible on hover) -->
      <div class="flex shrink-0 items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <UButton
          icon="i-lucide-pencil"
          color="neutral"
          variant="ghost"
          size="xs"
          aria-label="Edit reminder"
          @click="onStartEdit"
        />
        <UButton
          icon="i-lucide-trash-2"
          color="error"
          variant="ghost"
          size="xs"
          aria-label="Delete reminder"
          :loading="isDeleting"
          @click="onDelete"
        />
      </div>
    </div>
  </div>
</template>
