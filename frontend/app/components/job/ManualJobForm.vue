<script setup lang="ts">
import type { Job, CreateJobManualRequest } from '~/types/job';
import type { JobStatus } from '~/utils/constants';
import type { ApiResponse } from '~/types/api';

interface ManualJobFormProps {
  prefill?: Partial<CreateJobManualRequest>;
}

const props = withDefaults(defineProps<ManualJobFormProps>(), {
  prefill: undefined,
});

const emit = defineEmits<{
  created: [job: Job];
}>();

const api = useApi();
const toast = useToastNotify();

const isSubmitting = ref(false);

const state = reactive<{
  title: string;
  company: string;
  location: string;
  salaryRange: string;
  sourceUrl: string;
  status: JobStatus;
  notes: string;
}>({
  title: props.prefill?.title || '',
  company: props.prefill?.company || '',
  location: props.prefill?.location || '',
  salaryRange: props.prefill?.salaryRange || '',
  sourceUrl: props.prefill?.sourceUrl || '',
  status: props.prefill?.status || 'WISHLIST',
  notes: props.prefill?.notes || '',
});

// Watch prefill changes (e.g., switching from URL tab with partial data)
watch(
  () => props.prefill,
  (newPrefill) => {
    if (newPrefill) {
      if (newPrefill.title) state.title = newPrefill.title;
      if (newPrefill.company) state.company = newPrefill.company;
      if (newPrefill.location) state.location = newPrefill.location;
      if (newPrefill.salaryRange) state.salaryRange = newPrefill.salaryRange;
      if (newPrefill.sourceUrl) state.sourceUrl = newPrefill.sourceUrl;
      if (newPrefill.status) state.status = newPrefill.status;
      if (newPrefill.notes) state.notes = newPrefill.notes;
    }
  },
  { deep: true },
);

const statusOptions = JOB_STATUSES.map((status) => ({
  label: JOB_STATUS_LABELS[status],
  value: status,
}));

function validate(formState: typeof state): { name: string; message: string }[] {
  const errors: { name: string; message: string }[] = [];
  if (!formState.title.trim()) {
    errors.push({ name: 'title', message: 'Job title is required.' });
  }
  if (!formState.company.trim()) {
    errors.push({ name: 'company', message: 'Company name is required.' });
  }
  if (formState.sourceUrl.trim()) {
    try {
      new URL(formState.sourceUrl.trim());
    } catch {
      errors.push({ name: 'sourceUrl', message: 'Please enter a valid URL.' });
    }
  }
  return errors;
}

async function onSubmit() {
  isSubmitting.value = true;
  try {
    const payload: CreateJobManualRequest = {
      title: state.title.trim(),
      company: state.company.trim(),
      location: state.location.trim() || undefined,
      salaryRange: state.salaryRange.trim() || undefined,
      sourceUrl: state.sourceUrl.trim() || undefined,
      status: state.status,
      notes: state.notes.trim() || undefined,
    };
    const response = await api.post<ApiResponse<Job>>('/jobs', payload);
    toast.success('Job added successfully!');
    emit('created', response.data);
  } catch {
    // Error is handled by useApi toast
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <UForm :validate="validate" :state="state" class="space-y-4" @submit="onSubmit">
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UFormField name="title" label="Job Title" required>
        <UInput
          v-model="state.title"
          placeholder="e.g. Senior Frontend Engineer"
          icon="i-lucide-briefcase"
        />
      </UFormField>

      <UFormField name="company" label="Company" required>
        <UInput
          v-model="state.company"
          placeholder="e.g. Acme Corp"
          icon="i-lucide-building-2"
        />
      </UFormField>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <UFormField name="location" label="Location">
        <UInput
          v-model="state.location"
          placeholder="e.g. San Francisco, CA / Remote"
          icon="i-lucide-map-pin"
        />
      </UFormField>

      <UFormField name="salaryRange" label="Salary Range">
        <UInput
          v-model="state.salaryRange"
          placeholder="e.g. $120k - $160k"
          icon="i-lucide-banknote"
        />
      </UFormField>
    </div>

    <UFormField name="sourceUrl" label="Source URL">
      <UInput
        v-model="state.sourceUrl"
        placeholder="https://..."
        icon="i-lucide-link"
        class="font-mono text-sm"
      />
    </UFormField>

    <UFormField name="status" label="Initial Status">
      <USelect
        v-model="state.status"
        :items="statusOptions"
      />
    </UFormField>

    <UFormField name="notes" label="Notes">
      <UTextarea
        v-model="state.notes"
        placeholder="Any initial notes about this position..."
        :rows="3"
        autoresize
      />
    </UFormField>

    <div class="flex justify-end pt-2">
      <UButton
        type="submit"
        label="Add Job"
        icon="i-lucide-plus"
        color="primary"
        size="lg"
        :loading="isSubmitting"
      />
    </div>
  </UForm>
</template>
