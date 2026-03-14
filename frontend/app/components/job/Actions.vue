<script setup lang="ts">
import type { Job, UpdateJobRequest } from '~/types/job';
import type { JobStatus } from '~/utils/constants';
import type { ApiResponse } from '~/types/api';

interface JobActionsProps {
  job: Job;
}

const props = defineProps<JobActionsProps>();

const emit = defineEmits<{
  statusChanged: [job: Job];
  deleted: [jobId: string];
}>();

const api = useApi();
const toast = useToastNotify();

const isDeleting = ref(false);
const isDeleteConfirmOpen = ref(false);
const isChangingStatus = ref(false);

const currentStatus = ref<JobStatus>(props.job.status);

// Sync status with prop changes
watch(
  () => props.job.status,
  (newStatus) => {
    currentStatus.value = newStatus;
  },
);

const statusOptions = JOB_STATUSES.map((status) => ({
  label: JOB_STATUS_LABELS[status],
  value: status,
}));

async function onStatusChange(newStatus: JobStatus) {
  if (newStatus === props.job.status) return;

  isChangingStatus.value = true;
  try {
    const payload: UpdateJobRequest = { status: newStatus };
    const response = await api.patch<ApiResponse<Job>>(
      `/jobs/${props.job.id}`,
      payload,
    );
    toast.success(`Status changed to ${JOB_STATUS_LABELS[newStatus]}.`);
    emit('statusChanged', response.data);
  } catch {
    // Revert on failure
    currentStatus.value = props.job.status;
  } finally {
    isChangingStatus.value = false;
  }
}

async function onConfirmDelete() {
  isDeleting.value = true;
  try {
    await api.delete(`/jobs/${props.job.id}`);
    toast.success('Job deleted.');
    isDeleteConfirmOpen.value = false;
    emit('deleted', props.job.id);
  } catch {
    // Error handled by useApi
  } finally {
    isDeleting.value = false;
  }
}
</script>

<template>
  <div class="space-y-3">
    <h3 class="text-sm font-semibold text-highlighted">Actions</h3>

    <!-- Status -->
    <div class="space-y-1.5">
      <label class="text-xs text-dimmed">Status</label>
      <USelect
        v-model="currentStatus"
        :items="statusOptions"
        :loading="isChangingStatus"
        @update:model-value="onStatusChange"
      />
    </div>

    <!-- Action buttons -->
    <div class="flex flex-wrap gap-2 pt-1">
      <UButton
        v-if="props.job.sourceUrl"
        label="View Original"
        icon="i-lucide-external-link"
        variant="soft"
        color="neutral"
        size="sm"
        :to="props.job.sourceUrl"
        target="_blank"
      />
      <UButton
        label="Delete"
        icon="i-lucide-trash-2"
        variant="soft"
        color="error"
        size="sm"
        @click="isDeleteConfirmOpen = true"
      />
    </div>

    <!-- Delete confirmation modal -->
    <UModal v-model:open="isDeleteConfirmOpen" title="Delete Job">
      <template #body>
        <p class="text-sm text-muted">
          Are you sure you want to delete
          <span class="font-medium text-default">{{ props.job.title }}</span>
          at {{ props.job.company }}? This action cannot be undone.
        </p>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            label="Cancel"
            variant="ghost"
            color="neutral"
            @click="isDeleteConfirmOpen = false"
          />
          <UButton
            label="Delete Job"
            icon="i-lucide-trash-2"
            color="error"
            :loading="isDeleting"
            @click="onConfirmDelete"
          />
        </div>
      </template>
    </UModal>
  </div>
</template>
