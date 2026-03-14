<script setup lang="ts">
import type { Job, UpdateJobRequest } from '~/types/job';
import type { ApiResponse } from '~/types/api';

interface JobInfoSectionProps {
  job: Job;
}

const props = defineProps<JobInfoSectionProps>();

const emit = defineEmits<{
  updated: [job: Job];
}>();

const api = useApi();
const toast = useToastNotify();

const isEditing = ref(false);
const isSaving = ref(false);

const editState = reactive({
  title: '',
  company: '',
  location: '',
  salaryRange: '',
});

function onStartEdit() {
  editState.title = props.job.title;
  editState.company = props.job.company;
  editState.location = props.job.location || '';
  editState.salaryRange = props.job.salaryRange || '';
  isEditing.value = true;
}

function onCancelEdit() {
  isEditing.value = false;
}

async function onSaveEdit() {
  if (!editState.title.trim() || !editState.company.trim()) {
    toast.warning('Title and company are required.');
    return;
  }

  isSaving.value = true;
  try {
    const payload: UpdateJobRequest = {
      title: editState.title.trim(),
      company: editState.company.trim(),
      location: editState.location.trim() || undefined,
      salaryRange: editState.salaryRange.trim() || undefined,
    };
    const response = await api.patch<ApiResponse<Job>>(
      `/jobs/${props.job.id}`,
      payload,
    );
    isEditing.value = false;
    toast.success('Job updated.');
    emit('updated', response.data);
  } catch {
    // Error handled by useApi
  } finally {
    isSaving.value = false;
  }
}
</script>

<template>
  <div class="space-y-3">
    <div class="flex items-center justify-between">
      <h3 class="text-sm font-semibold text-highlighted">Details</h3>
      <UButton
        v-if="!isEditing"
        label="Edit"
        icon="i-lucide-pencil"
        variant="ghost"
        color="neutral"
        size="xs"
        @click="onStartEdit"
      />
      <div v-else class="flex gap-1">
        <UButton
          label="Cancel"
          variant="ghost"
          color="neutral"
          size="xs"
          @click="onCancelEdit"
        />
        <UButton
          label="Save"
          icon="i-lucide-check"
          color="primary"
          size="xs"
          :loading="isSaving"
          @click="onSaveEdit"
        />
      </div>
    </div>

    <!-- View Mode -->
    <div v-if="!isEditing" class="space-y-2.5">
      <div class="flex items-start gap-2">
        <UIcon name="i-lucide-briefcase" class="size-4 text-dimmed shrink-0 mt-0.5" />
        <div>
          <p class="text-xs text-dimmed">Title</p>
          <p class="text-sm text-default font-medium">{{ props.job.title }}</p>
        </div>
      </div>
      <div class="flex items-start gap-2">
        <UIcon name="i-lucide-building-2" class="size-4 text-dimmed shrink-0 mt-0.5" />
        <div>
          <p class="text-xs text-dimmed">Company</p>
          <p class="text-sm text-default font-medium">{{ props.job.company }}</p>
        </div>
      </div>
      <div v-if="props.job.location" class="flex items-start gap-2">
        <UIcon name="i-lucide-map-pin" class="size-4 text-dimmed shrink-0 mt-0.5" />
        <div>
          <p class="text-xs text-dimmed">Location</p>
          <p class="text-sm text-default">{{ props.job.location }}</p>
        </div>
      </div>
      <div v-if="props.job.salaryRange" class="flex items-start gap-2">
        <UIcon name="i-lucide-banknote" class="size-4 text-dimmed shrink-0 mt-0.5" />
        <div>
          <p class="text-xs text-dimmed">Salary</p>
          <p class="text-sm text-default">{{ props.job.salaryRange }}</p>
        </div>
      </div>
      <div class="flex items-start gap-2">
        <UIcon name="i-lucide-calendar" class="size-4 text-dimmed shrink-0 mt-0.5" />
        <div>
          <p class="text-xs text-dimmed">Added</p>
          <p class="text-sm text-default">{{ formatRelativeTime(props.job.createdAt) }}</p>
        </div>
      </div>
    </div>

    <!-- Edit Mode -->
    <div v-else class="space-y-3">
      <div>
        <label class="text-xs text-dimmed mb-1 block">Title</label>
        <UInput v-model="editState.title" size="sm" />
      </div>
      <div>
        <label class="text-xs text-dimmed mb-1 block">Company</label>
        <UInput v-model="editState.company" size="sm" />
      </div>
      <div>
        <label class="text-xs text-dimmed mb-1 block">Location</label>
        <UInput v-model="editState.location" size="sm" placeholder="Optional" />
      </div>
      <div>
        <label class="text-xs text-dimmed mb-1 block">Salary Range</label>
        <UInput v-model="editState.salaryRange" size="sm" placeholder="Optional" />
      </div>
    </div>
  </div>
</template>
