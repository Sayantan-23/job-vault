<script setup lang="ts">
const route = useRoute();

const isRegister = computed(() => route.path === '/app/auth/register');

const branding = computed(() => {
  if (isRegister.value) {
    return {
      icon: 'i-lucide-user-plus',
      title: 'Create Your Account',
      subtitle: 'Join JobVault to track your applications',
    };
  }
  return {
    icon: 'i-lucide-layout-grid',
    title: 'JobVault',
    subtitle: 'Ghost-Proof Your Job Search',
  };
});
</script>

<template>
  <div class="auth-bg relative flex min-h-screen flex-col items-center justify-center overflow-hidden p-4">
    <!-- Floating decorative elements -->
    <div class="pointer-events-none absolute right-[8%] top-[10%] flex size-16 items-center justify-center rounded-full border border-purple-200/50 bg-white/40 shadow-lg backdrop-blur-sm dark:border-purple-700/30 dark:bg-white/5">
      <UIcon name="i-lucide-briefcase" class="size-7 text-primary/40" />
    </div>
    <div class="pointer-events-none absolute bottom-[12%] left-[6%] flex size-14 items-center justify-center rounded-full border border-purple-200/50 bg-white/40 shadow-lg backdrop-blur-sm dark:border-purple-700/30 dark:bg-white/5">
      <UIcon name="i-lucide-bar-chart-3" class="size-6 text-primary/40" />
    </div>

    <div class="w-full max-w-md">
      <!-- Branding -->
      <div class="mb-8 flex flex-col items-center gap-3">
        <div
          class="flex size-14 items-center justify-center rounded-2xl bg-primary shadow-md"
        >
          <UIcon :name="branding.icon" class="size-7 text-white" />
        </div>

        <div class="text-center">
          <h1 class="text-2xl font-bold text-highlighted">
            {{ branding.title }}
          </h1>
          <p class="mt-1 text-sm text-muted">
            {{ branding.subtitle }}
          </p>
        </div>
      </div>

      <!-- Card -->
      <div
        class="rounded-2xl bg-white dark:bg-[rgba(17,12,30,0.85)] shadow-xl shadow-black/5 p-6 sm:p-8"
      >
        <slot />
      </div>
    </div>

    <!-- Footer -->
    <p class="mt-8 text-center text-xs uppercase tracking-wider text-muted/60">
      &copy; {{ new Date().getFullYear() }} JobVault &middot; All Rights Reserved
    </p>
  </div>
</template>
