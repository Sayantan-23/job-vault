<script setup lang="ts">
import type { TimelineEvent } from '~/types/timeline';

interface JobTimelineProps {
  jobId: string;
}

const props = defineProps<JobTimelineProps>();

const { events, isLoading, fetchTimeline } = useTimeline(props.jobId);

// Fetch on mount
onMounted(() => {
  fetchTimeline();
});

// Re-fetch when jobId changes
watch(
  () => props.jobId,
  () => {
    fetchTimeline();
  },
);

function onEntryCreated(event: TimelineEvent) {
  // Prepend to top (most recent first)
  events.value.unshift(event);
}
</script>

<template>
  <div class="space-y-4">
    <!-- Add entry form -->
    <TimelineAddEntry :job-id="props.jobId" @created="onEntryCreated" />

    <!-- Loading state -->
    <div v-if="isLoading && events.length === 0" class="flex justify-center py-6">
      <UiLoadingSpinner />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="!isLoading && events.length === 0"
      class="py-6 text-center"
    >
      <UIcon name="i-lucide-clock" class="mx-auto mb-2 size-8 text-dimmed" />
      <p class="text-sm text-dimmed">No timeline events yet</p>
      <p class="text-xs text-dimmed mt-0.5">Events will appear here as the job progresses</p>
    </div>

    <!-- Timeline entries -->
    <div v-else>
      <TimelineEntry
        v-for="(event, index) in events"
        :key="event.id"
        :event="event"
        :is-last="index === events.length - 1"
      />
    </div>
  </div>
</template>
