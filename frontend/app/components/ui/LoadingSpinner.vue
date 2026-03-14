<script setup lang="ts">
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

const props = withDefaults(defineProps<LoadingSpinnerProps>(), {
  size: 'md',
  label: undefined,
});

const sizeClasses: Record<string, string> = {
  sm: 'size-5',
  md: 'size-8',
  lg: 'size-12',
};
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-3 py-8">
    <UIcon
      name="i-lucide-loader-circle"
      :class="['animate-spin text-primary', sizeClasses[props.size]]"
    />
    <p v-if="props.label" class="text-sm text-muted">
      {{ props.label }}
    </p>
  </div>
</template>
