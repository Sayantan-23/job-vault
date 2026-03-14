<script setup lang="ts">
defineProps<{
  to?: string;
  label?: string;
}>();
</script>

<template>
  <NuxtLink
    :to="to"
    class="btn-icon-slide group relative inline-flex h-12 cursor-pointer items-center overflow-hidden rounded-full p-1 ps-6 pe-14 text-sm font-medium text-white transition-all duration-500 hover:ps-14 hover:pe-6"
  >
    <span class="relative z-10 transition-all duration-500">
      {{ label ?? 'Get Started Free' }}
    </span>
    <div
      class="absolute right-1 flex size-10 items-center justify-center rounded-full bg-white text-gray-900 transition-all duration-500 group-hover:right-[calc(100%-44px)] group-hover:rotate-45 dark:bg-gray-900 dark:text-white"
    >
      <UIcon name="i-lucide-arrow-up-right" class="size-4" />
    </div>
  </NuxtLink>
</template>
