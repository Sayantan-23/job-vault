<script setup lang="ts">
import type { TimelineEvent } from '~/types/timeline';

interface TimelineEntryProps {
  event: TimelineEvent;
  isLast?: boolean;
}

const props = withDefaults(defineProps<TimelineEntryProps>(), {
  isLast: false,
});

const isAuto = computed(() => props.event.type === 'AUTO');

const iconName = computed(() =>
  isAuto.value ? 'i-lucide-bot' : 'i-lucide-pencil',
);

const iconColorClass = computed(() =>
  isAuto.value
    ? 'bg-neutral-100 dark:bg-neutral-800 text-muted'
    : 'bg-primary/10 dark:bg-primary/20 text-primary',
);
</script>

<template>
  <div class="relative flex gap-3">
    <!-- Connector line -->
    <div class="flex flex-col items-center">
      <div
        class="flex size-8 shrink-0 items-center justify-center rounded-full"
        :class="iconColorClass"
      >
        <UIcon :name="iconName" class="size-4" />
      </div>
      <div
        v-if="!props.isLast"
        class="mt-1 w-px flex-1 bg-gray-200 dark:bg-gray-700"
      />
    </div>

    <!-- Content -->
    <div class="flex-1 pb-5" :class="{ 'pb-0': props.isLast }">
      <div class="flex items-start justify-between gap-2">
        <div class="min-w-0 flex-1">
          <p
            class="text-sm font-medium"
            :class="isAuto ? 'text-muted' : 'text-default'"
          >
            {{ props.event.title }}
          </p>
          <p
            v-if="props.event.description"
            class="mt-0.5 text-xs text-dimmed line-clamp-2"
          >
            {{ props.event.description }}
          </p>
        </div>
        <span class="shrink-0 text-xs text-dimmed whitespace-nowrap">
          {{ formatRelativeTime(props.event.createdAt) }}
        </span>
      </div>
    </div>
  </div>
</template>
