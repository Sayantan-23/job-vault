<script setup lang="ts">
import type { Job } from '~/types/job';

const drawer = useJobDrawer();

// When the slideover is closed externally (escape, overlay click),
// clean up the drawer state
watch(
  () => drawer.isOpen.value,
  (isOpen) => {
    if (!isOpen && drawer.selectedJobId.value) {
      drawer.selectedJobId.value = null;
      drawer.selectedJob.value = null;
    }
  },
);

function onJobUpdated(job: Job) {
  drawer.selectedJob.value = job;
}

function onJobDeleted(_jobId: string) {
  drawer.closeDrawer();
}
</script>

<template>
  <USlideover
    v-model:open="drawer.isOpen.value"
    side="right"
    :title="drawer.selectedJob.value?.title || 'Job Details'"
    :ui="{
      width: 'sm:max-w-4xl w-full',
    }"
  >
    <template #body>
      <!-- Loading -->
      <div v-if="drawer.isLoading.value" class="flex items-center justify-center py-24">
        <UiLoadingSpinner label="Loading job details..." />
      </div>

      <!-- Job content: split panel -->
      <div
        v-else-if="drawer.selectedJob.value"
        class="flex flex-col lg:flex-row h-full min-h-0"
      >
        <!-- Left panel: Snapshot (60%) -->
        <div
          class="lg:w-3/5 w-full border-b lg:border-b-0 lg:border-r border-default min-h-0 overflow-y-auto"
        >
          <JobSnapshot
            :markdown="drawer.selectedJob.value.snapshotMarkdown"
            :source-url="drawer.selectedJob.value.sourceUrl"
          />
        </div>

        <!-- Right panel: Details (40%) -->
        <div class="lg:w-2/5 w-full min-h-0 overflow-y-auto">
          <JobDetails
            :job="drawer.selectedJob.value"
            @updated="onJobUpdated"
            @deleted="onJobDeleted"
          />
        </div>
      </div>

      <!-- Error / empty state -->
      <div v-else class="flex items-center justify-center py-24">
        <UiEmptyState
          icon="i-lucide-file-x"
          title="Job not found"
          description="This job could not be loaded."
        />
      </div>
    </template>
  </USlideover>
</template>
