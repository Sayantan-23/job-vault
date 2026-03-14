<script setup lang="ts">
type ViewMode = 'kanban' | 'list';

interface ViewToggleProps {
  modelValue: ViewMode;
}

const props = defineProps<ViewToggleProps>();

const emit = defineEmits<{
  'update:modelValue': [value: ViewMode];
}>();

function onSelect(mode: ViewMode) {
  emit('update:modelValue', mode);
}
</script>

<template>
  <div class="inline-flex rounded-lg border border-default bg-muted/50 p-0.5">
    <UButton
      icon="i-lucide-columns-3"
      size="xs"
      :variant="props.modelValue === 'kanban' ? 'solid' : 'ghost'"
      :color="props.modelValue === 'kanban' ? 'primary' : 'neutral'"
      aria-label="Kanban view"
      @click="onSelect('kanban')"
    />
    <UButton
      icon="i-lucide-list"
      size="xs"
      :variant="props.modelValue === 'list' ? 'solid' : 'ghost'"
      :color="props.modelValue === 'list' ? 'primary' : 'neutral'"
      aria-label="List view"
      @click="onSelect('list')"
    />
  </div>
</template>
