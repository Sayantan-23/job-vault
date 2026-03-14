<script setup lang="ts">
import type { Reminder, CreateReminderRequest } from '~/types/reminder';
import type { ApiResponse } from '~/types/api';

interface AddReminderFormProps {
  jobId: string;
}

const props = defineProps<AddReminderFormProps>();

const emit = defineEmits<{
  created: [reminder: Reminder];
}>();

const api = useApi();
const toast = useToastNotify();

const isExpanded = ref(false);
const message = ref('');
const remindAt = ref('');
const isSubmitting = ref(false);

function getPresetDate(preset: 'tomorrow' | '3days' | 'nextweek'): string {
  const now = new Date();
  let target: Date;

  switch (preset) {
    case 'tomorrow':
      target = new Date(now);
      target.setDate(target.getDate() + 1);
      target.setHours(9, 0, 0, 0);
      break;
    case '3days':
      target = new Date(now);
      target.setDate(target.getDate() + 3);
      target.setHours(9, 0, 0, 0);
      break;
    case 'nextweek':
      target = new Date(now);
      target.setDate(target.getDate() + 7);
      target.setHours(9, 0, 0, 0);
      break;
  }

  // Format for datetime-local input
  const offset = target.getTimezoneOffset();
  const local = new Date(target.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function onPreset(preset: 'tomorrow' | '3days' | 'nextweek') {
  remindAt.value = getPresetDate(preset);
}

function onExpand() {
  isExpanded.value = true;
  message.value = '';
  remindAt.value = '';
}

function onCancel() {
  isExpanded.value = false;
  message.value = '';
  remindAt.value = '';
}

async function onSubmit() {
  if (!message.value.trim() || !remindAt.value) return;

  isSubmitting.value = true;

  const data: CreateReminderRequest = {
    message: message.value.trim(),
    remindAt: new Date(remindAt.value).toISOString(),
  };

  try {
    const response = await api.post<ApiResponse<Reminder>>(
      `/jobs/${props.jobId}/reminders`,
      data,
    );
    toast.success('Reminder created.');
    isExpanded.value = false;
    message.value = '';
    remindAt.value = '';
    emit('created', response.data);
  } catch {
    toast.error('Failed to create reminder.');
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div>
    <!-- Collapsed state -->
    <UButton
      v-if="!isExpanded"
      label="Add reminder"
      icon="i-lucide-bell-plus"
      color="neutral"
      variant="soft"
      size="sm"
      block
      @click="onExpand"
    />

    <!-- Expanded form -->
    <div
      v-else
      class="space-y-3 rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md p-3"
    >
      <UInput
        v-model="message"
        placeholder="Reminder message..."
        size="sm"
        autofocus
      />

      <div class="space-y-2">
        <label class="text-xs font-medium text-muted">When</label>
        <input
          v-model="remindAt"
          type="datetime-local"
          class="w-full rounded-md border border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 px-2.5 py-1.5 text-sm text-default focus:outline-none focus:ring-2 focus:ring-primary/40"
        />

        <!-- Quick presets -->
        <div class="flex flex-wrap gap-1.5">
          <UButton
            label="Tomorrow"
            color="neutral"
            variant="outline"
            size="xs"
            @click="onPreset('tomorrow')"
          />
          <UButton
            label="In 3 days"
            color="neutral"
            variant="outline"
            size="xs"
            @click="onPreset('3days')"
          />
          <UButton
            label="Next week"
            color="neutral"
            variant="outline"
            size="xs"
            @click="onPreset('nextweek')"
          />
        </div>
      </div>

      <div class="flex items-center justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          size="xs"
          @click="onCancel"
        />
        <UButton
          label="Add Reminder"
          icon="i-lucide-bell"
          color="primary"
          size="xs"
          :loading="isSubmitting"
          :disabled="!message.trim() || !remindAt"
          @click="onSubmit"
        />
      </div>
    </div>
  </div>
</template>
