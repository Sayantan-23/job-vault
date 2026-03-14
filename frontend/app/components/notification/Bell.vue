<script setup lang="ts">
const { unreadCount } = useNotifications();

const isPopoverOpen = ref(false);
</script>

<template>
  <UPopover v-model:open="isPopoverOpen">
    <!-- Trigger: Bell button wrapped in UChip for badge -->
    <template #default>
      <UChip
        :show="unreadCount > 0"
        :text="unreadCount > 99 ? '99+' : String(unreadCount)"
        color="error"
        size="lg"
      >
        <UButton
          icon="i-lucide-bell"
          color="neutral"
          variant="ghost"
          size="md"
          aria-label="Notifications"
        />
      </UChip>
    </template>

    <!-- Popover content -->
    <template #content>
      <NotificationPopover @close="isPopoverOpen = false" />
    </template>
  </UPopover>
</template>
