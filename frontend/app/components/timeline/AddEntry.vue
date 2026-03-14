<script setup lang="ts">
import type { TimelineEvent, CreateTimelineEventRequest } from '~/types/timeline';
import type { ApiResponse } from '~/types/api';

interface AddEntryProps {
  jobId: string;
}

const props = defineProps<AddEntryProps>();

const emit = defineEmits<{
  created: [event: TimelineEvent];
}>();

const api = useApi();
const toast = useToastNotify();

const isExpanded = ref(false);
const title = ref('');
const description = ref('');
const isSubmitting = ref(false);

function onExpand() {
  isExpanded.value = true;
  title.value = '';
  description.value = '';
}

function onCancel() {
  isExpanded.value = false;
  title.value = '';
  description.value = '';
}

async function onSubmit() {
  if (!title.value.trim()) return;

  isSubmitting.value = true;

  const data: CreateTimelineEventRequest = {
    title: title.value.trim(),
  };

  if (description.value.trim()) {
    data.description = description.value.trim();
  }

  try {
    const response = await api.post<ApiResponse<TimelineEvent>>(
      `/jobs/${props.jobId}/timeline`,
      data,
    );
    toast.success('Timeline entry added.');
    isExpanded.value = false;
    title.value = '';
    description.value = '';
    emit('created', response.data);
  } catch {
    toast.error('Failed to add timeline entry.');
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div>
    <!-- Collapsed state: "Add note" button -->
    <UButton
      v-if="!isExpanded"
      label="Add note"
      icon="i-lucide-plus"
      color="neutral"
      variant="soft"
      size="sm"
      block
      @click="onExpand"
    />

    <!-- Expanded state: inline form -->
    <div
      v-else
      class="space-y-3 rounded-xl border border-gray-200/50 dark:border-gray-700/50 bg-white/50 dark:bg-gray-800/50 backdrop-blur-md p-3"
    >
      <UInput
        v-model="title"
        placeholder="Entry title..."
        size="sm"
        autofocus
        @keydown.enter.prevent="onSubmit"
      />

      <UTextarea
        v-model="description"
        placeholder="Optional description..."
        :rows="2"
        autoresize
        :maxrows="4"
        size="sm"
      />

      <div class="flex items-center justify-end gap-2">
        <UButton
          label="Cancel"
          color="neutral"
          variant="ghost"
          size="xs"
          @click="onCancel"
        />
        <UButton
          label="Add"
          icon="i-lucide-plus"
          color="primary"
          size="xs"
          :loading="isSubmitting"
          :disabled="!title.trim()"
          @click="onSubmit"
        />
      </div>
    </div>
  </div>
</template>
