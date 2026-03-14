<script setup lang="ts">
import type { KanbanColumn, MoveJobPayload } from '~/types/job';

interface KanbanBoardProps {
  columns: KanbanColumn[];
}

defineProps<KanbanBoardProps>();

const emit = defineEmits<{
  'move-job': [payload: MoveJobPayload];
}>();

function onMoveJob(payload: MoveJobPayload) {
  emit('move-job', payload);
}
</script>

<template>
  <div class="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
    <KanbanColumn
      v-for="column in columns"
      :key="column.status"
      :column="column"
      @move-job="onMoveJob"
    />
  </div>
</template>
