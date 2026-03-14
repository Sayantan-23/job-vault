<script setup lang="ts">
import type { MoveJobPayload } from '~/types/job';

definePageMeta({
  layout: 'default',
});

const jobs = useJobs();
const addJobModal = useAddJobModal();
const jobDrawer = useJobDrawer();

const viewMode = ref<'kanban' | 'list'>('kanban');

// Fetch kanban data on mount
onMounted(async () => {
  await jobs.fetchKanban();
});

function onOpenAddJob() {
  addJobModal.open();
}

async function onJobCreated() {
  await jobs.refreshAfterJobChange();
}

async function onMoveJob(payload: MoveJobPayload) {
  await jobs.moveJob(payload);
}

// Re-fetch kanban when drawer closes (in case job was updated/deleted)
watch(
  () => jobDrawer.isOpen.value,
  (isOpen, wasOpen) => {
    if (!isOpen && wasOpen) {
      jobs.refreshAfterJobChange();
    }
  },
);

const hasJobs = computed(() => {
  if (!jobs.kanbanData.value) return false;
  return jobs.kanbanData.value.stats.totalJobs > 0;
});
</script>

<template>
  <div>
    <!-- Loading State -->
    <div v-if="jobs.isLoading.value && !jobs.kanbanData.value" class="py-24">
      <UiLoadingSpinner size="lg" label="Loading your dashboard..." />
    </div>

    <!-- Dashboard Content -->
    <template v-else-if="jobs.kanbanData.value">
      <!-- Stats Row -->
      <DashboardStats
        v-if="hasJobs"
        :stats="jobs.kanbanData.value.stats"
        class="mb-6"
      />

      <!-- Toolbar: Title + ViewToggle + Add Job -->
      <div class="mb-4 flex items-center justify-between">
        <div>
          <h1 class="text-2xl font-bold text-highlighted">Dashboard</h1>
          <p class="text-sm text-muted">Track your job applications at a glance.</p>
        </div>
        <div class="flex items-center gap-3">
          <DashboardViewToggle v-if="hasJobs" v-model="viewMode" />
          <UButton
            label="Add Job"
            icon="i-lucide-plus"
            color="primary"
            class="hidden sm:flex"
            @click="onOpenAddJob"
          />
          <UButton
            icon="i-lucide-plus"
            color="primary"
            class="sm:hidden"
            aria-label="Add Job"
            @click="onOpenAddJob"
          />
        </div>
      </div>

      <!-- Kanban Board -->
      <KanbanBoard
        v-if="hasJobs && viewMode === 'kanban'"
        :columns="jobs.kanbanData.value.columns"
        @move-job="onMoveJob"
      />

      <!-- List View Placeholder (FE-05) -->
      <div
        v-else-if="hasJobs && viewMode === 'list'"
        class="rounded-xl border border-white/20 dark:border-gray-700/30 bg-white/60 dark:bg-gray-900/60 backdrop-blur-xl p-8 text-center"
      >
        <UIcon name="i-lucide-list" class="size-10 text-dimmed mx-auto mb-3" />
        <p class="text-sm text-muted">List view coming soon.</p>
      </div>

      <!-- Empty State -->
      <UiEmptyState
        v-else
        icon="i-lucide-briefcase"
        title="No applications yet"
        description="Start by adding your first job application to track your progress."
        action-label="Add Your First Job"
        @action="onOpenAddJob"
      />
    </template>

    <!-- Error fallback (no data loaded and not loading) -->
    <UiEmptyState
      v-else
      icon="i-lucide-wifi-off"
      title="Could not load dashboard"
      description="There was a problem fetching your data. Please try again."
      action-label="Retry"
      @action="jobs.fetchKanban()"
    />

    <!-- Add Job Modal (uses shared composable state) -->
    <JobAddJobModal @created="onJobCreated" />

    <!-- Job Detail Drawer (global, always mounted) -->
    <JobDrawer />
  </div>
</template>
