<script setup lang="ts">
import { marked } from 'marked';

interface JobSnapshotProps {
  markdown?: string;
  sourceUrl?: string;
}

const props = withDefaults(defineProps<JobSnapshotProps>(), {
  markdown: undefined,
  sourceUrl: undefined,
});

// Configure marked for safe rendering
marked.setOptions({
  breaks: true,
  gfm: true,
});

const renderedHtml = computed(() => {
  if (!props.markdown) return '';
  return marked(props.markdown) as string;
});
</script>

<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex items-center justify-between px-5 py-3 border-b border-default">
      <div class="flex items-center gap-2">
        <UIcon name="i-lucide-file-text" class="size-4 text-muted" />
        <span class="text-sm font-medium text-default">Job Snapshot</span>
      </div>
      <UButton
        v-if="props.sourceUrl"
        label="View Original"
        icon="i-lucide-external-link"
        variant="ghost"
        color="primary"
        size="xs"
        :to="props.sourceUrl"
        target="_blank"
      />
    </div>

    <!-- Content -->
    <div class="flex-1 overflow-y-auto px-5 py-4">
      <!-- Rendered markdown -->
      <div
        v-if="renderedHtml"
        class="prose prose-sm dark:prose-invert max-w-none prose-headings:text-highlighted prose-p:text-default prose-a:text-primary prose-strong:text-highlighted prose-code:text-primary prose-code:bg-muted prose-code:px-1 prose-code:py-0.5 prose-code:rounded"
        v-html="renderedHtml"
      />

      <!-- Empty state -->
      <div
        v-else
        class="flex flex-col items-center justify-center gap-3 py-16 text-center"
      >
        <div class="rounded-2xl bg-muted p-4">
          <UIcon name="i-lucide-file-x" class="size-8 text-dimmed" />
        </div>
        <div class="space-y-1">
          <p class="text-sm font-medium text-muted">No snapshot captured</p>
          <p class="text-xs text-dimmed">
            The original job posting was not saved.
          </p>
        </div>
        <UButton
          v-if="props.sourceUrl"
          label="View Original Posting"
          icon="i-lucide-external-link"
          variant="soft"
          color="primary"
          size="sm"
          :to="props.sourceUrl"
          target="_blank"
        />
      </div>
    </div>
  </div>
</template>
