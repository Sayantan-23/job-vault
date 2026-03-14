<script setup lang="ts">
const currentYear = new Date().getFullYear();
</script>

<template>
  <footer class="border-t border-default py-6">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
      <p class="text-center text-sm text-muted">
        {{ currentYear }} JobVault. Track smarter, land faster.
      </p>
    </div>
  </footer>
</template>
