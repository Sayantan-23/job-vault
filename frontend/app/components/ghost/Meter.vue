<script setup lang="ts">
interface GhostMeterProps {
  ghostDays: number;
}

const props = defineProps<GhostMeterProps>();

const ghostColor = computed(() => {
  if (props.ghostDays <= GHOST_DAYS_ACTIVE_THRESHOLD) return 'text-emerald-500';
  if (props.ghostDays <= GHOST_DAYS_STALE_THRESHOLD) return 'text-amber-500';
  return 'text-rose-500';
});

const ghostIcon = computed(() => {
  if (props.ghostDays <= GHOST_DAYS_ACTIVE_THRESHOLD) return 'i-lucide-clock';
  if (props.ghostDays <= GHOST_DAYS_STALE_THRESHOLD) return 'i-lucide-timer';
  return 'i-lucide-ghost';
});

const tooltipText = computed(() => {
  if (props.ghostDays === 0) return 'Active today';
  if (props.ghostDays === 1) return 'Last activity: 1 day ago';
  return `Last activity: ${props.ghostDays} days ago`;
});
</script>

<template>
  <UTooltip :text="tooltipText">
    <div class="flex items-center gap-1" :class="ghostColor">
      <UIcon :name="ghostIcon" class="size-3.5" />
      <span class="text-xs font-medium">{{ props.ghostDays }}d</span>
    </div>
  </UTooltip>
</template>
