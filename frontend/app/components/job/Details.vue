<script setup lang="ts">
import type { Job } from '~/types/job';

interface JobDetailsProps {
  job: Job;
}

const props = defineProps<JobDetailsProps>();

const emit = defineEmits<{
  updated: [job: Job];
  deleted: [jobId: string];
}>();

const activeTab = ref('timeline');

const tabItems = [
  { label: 'Timeline', value: 'timeline', icon: 'i-lucide-clock' },
  { label: 'Reminders', value: 'reminders', icon: 'i-lucide-bell' },
  { label: 'Notes', value: 'notes', icon: 'i-lucide-sticky-note' },
  { label: 'Cover Letter', value: 'cover-letter', icon: 'i-lucide-file-pen' },
];

function onJobUpdated(job: Job) {
  emit('updated', job);
}

function onNotesUpdated(_notes: string) {
  // Notes updated via auto-save; no need to emit full job
}

function onStatusChanged(job: Job) {
  emit('updated', job);
}

function onDeleted(jobId: string) {
  emit('deleted', jobId);
}
</script>

<template>
  <div class="flex flex-col h-full overflow-y-auto">
    <!-- Status badge at top -->
    <div class="px-5 pt-4 pb-2">
      <JobStatusBadge :status="props.job.status" />
    </div>

    <!-- Content sections -->
    <div class="flex-1 px-5 pb-5 space-y-5">
      <!-- Info section -->
      <JobInfoSection
        :job="props.job"
        @updated="onJobUpdated"
      />

      <USeparator />

      <!-- Actions -->
      <JobActions
        :job="props.job"
        @status-changed="onStatusChanged"
        @deleted="onDeleted"
      />

      <USeparator />

      <!-- Tabbed content: Timeline, Reminders, Notes, Cover Letter -->
      <UTabs v-model="activeTab" :items="tabItems" class="w-full">
        <template #content="{ item }">
          <div class="pt-4">
            <!-- Timeline tab -->
            <TimelineJob
              v-if="item.value === 'timeline'"
              :job-id="props.job.id"
            />

            <!-- Reminders tab -->
            <ReminderList
              v-if="item.value === 'reminders'"
              :job-id="props.job.id"
            />

            <!-- Notes tab -->
            <JobNotesEditor
              v-if="item.value === 'notes'"
              :job-id="props.job.id"
              :notes="props.job.notes"
              @updated="onNotesUpdated"
            />

            <!-- Cover Letter tab (placeholder for FE-07) -->
            <div v-if="item.value === 'cover-letter'" class="py-6 text-center">
              <UIcon name="i-lucide-file-pen" class="mx-auto mb-2 size-8 text-dimmed" />
              <p class="text-sm text-dimmed">AI cover letters coming soon</p>
              <p class="text-xs text-dimmed mt-0.5">Generate tailored cover letters for this position</p>
            </div>
          </div>
        </template>
      </UTabs>
    </div>
  </div>
</template>
