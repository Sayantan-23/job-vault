<script setup lang="ts">
import type { JobCard } from '~/types/job';

interface KanbanCardProps {
  job: JobCard;
}

const props = defineProps<KanbanCardProps>();

const emit = defineEmits<{
  click: [job: JobCard];
}>();

const drawer = useJobDrawer();

const displayDate = computed(() => {
  const dateSource = props.job.lastActivityAt || props.job.createdAt;
  return formatRelativeTime(dateSource);
});

function onClick() {
  drawer.openDrawer(props.job.id);
  emit('click', props.job);
}
</script>

<template>
  <div
    class="group cursor-grab rounded-xl border border-white/20 dark:border-gray-700/30 bg-white/70 dark:bg-gray-800/70 backdrop-blur-lg p-3 shadow-sm shadow-black/5 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/10 active:cursor-grabbing"
    @click="onClick"
  >
    <!-- Title -->
    <h4 class="text-sm font-semibold text-highlighted truncate">
      {{ props.job.title }}
    </h4>

    <!-- Company -->
    <p class="mt-0.5 text-xs font-medium text-default truncate">
      {{ props.job.company }}
    </p>

    <!-- Location (optional) -->
    <p v-if="props.job.location" class="mt-0.5 text-xs text-muted truncate">
      <UIcon name="i-lucide-map-pin" class="size-3 inline-block mr-0.5 -mt-px" />
      {{ props.job.location }}
    </p>

    <!-- Footer: Ghost Meter + Date -->
    <div class="mt-2 flex items-center justify-between">
      <GhostMeter :ghost-days="props.job.ghostDays" />
      <span class="text-[11px] text-dimmed">{{ displayDate }}</span>
    </div>
  </div>
</template>
