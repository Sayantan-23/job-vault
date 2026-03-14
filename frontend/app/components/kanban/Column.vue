<script setup lang="ts">
import { VueDraggable } from 'vue-draggable-plus';
import type { JobCard, KanbanColumn, MoveJobPayload } from '~/types/job';

interface KanbanColumnProps {
  column: KanbanColumn;
}

const props = defineProps<KanbanColumnProps>();

const emit = defineEmits<{
  'move-job': [payload: MoveJobPayload];
}>();

const jobsComposable = useJobs();

/**
 * Color classes for the top border based on the Nuxt UI semantic color.
 */
const borderColorClass = computed(() => {
  const colorMap: Record<string, string> = {
    neutral: 'border-t-neutral-400 dark:border-t-neutral-500',
    info: 'border-t-info',
    warning: 'border-t-warning',
    success: 'border-t-success',
    error: 'border-t-error',
  };
  return colorMap[props.column.color] || 'border-t-neutral-400';
});

/**
 * Badge color for the job count.
 */
const badgeColor = computed(() => {
  return props.column.color as 'neutral' | 'info' | 'warning' | 'success' | 'error';
});

/**
 * Local reactive list of jobs for vue-draggable-plus.
 * vue-draggable-plus mutates the array in-place during drag operations.
 * We use a writable computed that proxies to the column's jobs array.
 */
const columnJobs = computed({
  get: () => props.column.jobs,
  set: (newJobs: JobCard[]) => {
    props.column.jobs.splice(0, props.column.jobs.length, ...newJobs);
  },
});

/**
 * Handle the end of a drag operation.
 * By the time this fires, vue-draggable-plus has already mutated the arrays.
 * We read the current state to determine the new order.
 */
function onDragEnd(event: {
  newIndex?: number;
  oldIndex?: number;
  from?: HTMLElement;
  to?: HTMLElement;
  item?: HTMLElement;
}) {
  const newIndex = event.newIndex ?? 0;

  // The card at newIndex in our column is the one that was just dropped
  const movedCard = props.column.jobs[newIndex];
  if (!movedCard) return;

  // Build a list of sibling orders (excluding the moved card) for calculation
  const siblings = props.column.jobs.filter((j) => j.id !== movedCard.id);
  const newOrder = jobsComposable.calculateNewOrder(siblings, newIndex);

  // Emit the move event for the composable to handle API call
  emit('move-job', {
    jobId: movedCard.id,
    newStatus: props.column.status,
    newOrder,
  });
}
</script>

<template>
  <div
    class="flex w-[280px] min-w-[280px] flex-col rounded-xl border-t-[3px] bg-muted/30 dark:bg-gray-900/30"
    :class="borderColorClass"
  >
    <!-- Column Header -->
    <div class="flex items-center justify-between px-3 py-2.5">
      <div class="flex items-center gap-2">
        <h3 class="text-sm font-semibold text-highlighted">
          {{ props.column.label }}
        </h3>
        <UBadge
          :label="String(props.column.jobs.length)"
          :color="badgeColor"
          variant="subtle"
          size="sm"
        />
      </div>
    </div>

    <!-- Droppable Area -->
    <VueDraggable
      v-model="columnJobs"
      group="kanban"
      :animation="200"
      ghost-class="kanban-ghost"
      drag-class="kanban-drag"
      class="flex flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2"
      :style="{ minHeight: '120px' }"
      @end="onDragEnd"
    >
      <KanbanCard
        v-for="job in columnJobs"
        :key="job.id"
        :job="job"
      />
    </VueDraggable>
  </div>
</template>
