<script setup lang="ts">
const colorMode = useColorMode();
const auth = useAuth();
const addJobModal = useAddJobModal();

function onToggleColorMode() {
  colorMode.preference = colorMode.value === 'dark' ? 'light' : 'dark';
}

async function onLogout() {
  await auth.logout();
}

function onOpenAddJob() {
  addJobModal.open();
}

const userInitials = computed(() => {
  const name = auth.user.value?.name || '';
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2) || '?';
});

const userMenuItems = computed(() => [
  [
    {
      label: 'Profile & Settings',
      icon: 'i-lucide-settings',
      onSelect: () => navigateTo('/app/profile'),
    },
  ],
  [
    {
      label: 'Sign out',
      icon: 'i-lucide-log-out',
      color: 'error' as const,
      onSelect: () => onLogout(),
    },
  ],
]);
</script>

<template>
  <header
    class="sticky top-0 z-50 w-full border-b border-white/20 dark:border-gray-700/30 bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl"
  >
    <div class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
      <!-- Logo -->
      <NuxtLink to="/app/dashboard" class="flex items-center gap-2">
        <UIcon name="i-lucide-briefcase" class="size-7 text-primary" />
        <span class="text-xl font-bold text-highlighted">JobVault</span>
      </NuxtLink>

      <!-- Right side actions -->
      <div class="flex items-center gap-2">
        <!-- Add Job button -->
        <UButton
          label="Add Job"
          icon="i-lucide-plus"
          color="primary"
          size="sm"
          class="hidden sm:flex"
          @click="onOpenAddJob"
        />
        <UButton
          icon="i-lucide-plus"
          color="primary"
          size="sm"
          class="sm:hidden"
          aria-label="Add Job"
          @click="onOpenAddJob"
        />

        <!-- Placeholder: Search (FE-05) -->

        <!-- Notifications -->
        <NotificationBell />

        <!-- Dark mode toggle -->
        <UButton
          :icon="colorMode.value === 'dark' ? 'i-lucide-sun' : 'i-lucide-moon'"
          color="neutral"
          variant="ghost"
          size="md"
          aria-label="Toggle color mode"
          @click="onToggleColorMode"
        />

        <!-- User menu dropdown -->
        <UDropdownMenu :items="userMenuItems">
          <button
            type="button"
            class="flex items-center gap-2 rounded-full p-0.5 transition-all duration-200 hover:ring-2 hover:ring-primary/30 focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            <UAvatar
              :text="userInitials"
              size="sm"
              class="ring-2 ring-primary/20"
            />
            <div class="hidden sm:flex flex-col items-start mr-1">
              <span class="text-xs font-medium text-default leading-tight">
                {{ auth.user.value?.name || 'User' }}
              </span>
              <span class="text-[10px] text-muted leading-tight">
                {{ auth.user.value?.email || '' }}
              </span>
            </div>
            <UIcon name="i-lucide-chevron-down" class="hidden sm:block size-3.5 text-muted" />
          </button>
        </UDropdownMenu>
      </div>
    </div>
  </header>
</template>
