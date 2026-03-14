<script setup lang="ts">
interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  actionLabel?: string;
}

const props = withDefaults(defineProps<EmptyStateProps>(), {
  icon: 'i-lucide-inbox',
  description: undefined,
  actionLabel: undefined,
});

const emit = defineEmits<{
  action: [];
}>();
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-4 py-16 text-center">
    <div class="rounded-2xl bg-muted p-4">
      <UIcon :name="props.icon" class="size-10 text-dimmed" />
    </div>
    <div class="space-y-1">
      <h3 class="text-lg font-semibold text-highlighted">
        {{ props.title }}
      </h3>
      <p v-if="props.description" class="max-w-sm text-sm text-muted">
        {{ props.description }}
      </p>
    </div>
    <UButton
      v-if="props.actionLabel"
      :label="props.actionLabel"
      color="primary"
      variant="soft"
      @click="emit('action')"
    />
  </div>
</template>
