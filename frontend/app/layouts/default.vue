<script setup lang="ts">
const { startPolling, stopPolling } = useNotifications();

onMounted(() => {
  startPolling(60000); // Poll every 60 seconds
});

onUnmounted(() => {
  stopPolling();
});
</script>

<template>
  <div class="min-h-screen bg-default">
    <LayoutAppHeader />
    <main class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <slot />
    </main>
    <LayoutAppFooter />
  </div>
</template>
