<script setup lang="ts">
import type { Notification, NotificationType } from '~/types/notification';

const emit = defineEmits<{
  close: [void];
}>();

const { notifications, unreadCount, isLoading, markRead, markAllRead } = useNotifications();
const jobDrawer = useJobDrawer();

function getNotificationIcon(type: NotificationType): string {
  switch (type) {
    case 'GHOST_ALERT':
      return 'i-lucide-ghost';
    case 'REMINDER':
      return 'i-lucide-bell';
    case 'STATUS_CHANGE':
      return 'i-lucide-arrow-right-left';
    case 'GENERAL':
    default:
      return 'i-lucide-info';
  }
}

function getNotificationIconColor(type: NotificationType): string {
  switch (type) {
    case 'GHOST_ALERT':
      return 'text-error';
    case 'REMINDER':
      return 'text-warning';
    case 'STATUS_CHANGE':
      return 'text-info';
    case 'GENERAL':
    default:
      return 'text-muted';
  }
}

async function onClickNotification(notification: Notification) {
  // Mark as read
  if (!notification.isRead) {
    await markRead(notification.id);
  }

  // Navigate to related job if available
  if (notification.relatedJobId) {
    jobDrawer.openDrawer(notification.relatedJobId);
    emit('close');
  }
}

async function onMarkAllRead() {
  await markAllRead();
}

// Limit displayed notifications (show most recent 20)
const displayedNotifications = computed(() =>
  notifications.value.slice(0, 20),
);
</script>

<template>
  <div class="w-80 sm:w-96">
    <!-- Header -->
    <div class="flex items-center justify-between border-b border-gray-200/50 dark:border-gray-700/50 px-4 py-3">
      <h3 class="text-sm font-semibold text-highlighted">Notifications</h3>
      <UButton
        v-if="unreadCount > 0"
        label="Mark all read"
        color="neutral"
        variant="link"
        size="xs"
        @click="onMarkAllRead"
      />
    </div>

    <!-- Loading -->
    <div v-if="isLoading && notifications.length === 0" class="flex justify-center py-8">
      <UiLoadingSpinner />
    </div>

    <!-- Empty state -->
    <div
      v-else-if="notifications.length === 0"
      class="py-8 text-center"
    >
      <UIcon name="i-lucide-bell-off" class="mx-auto mb-2 size-8 text-dimmed" />
      <p class="text-sm text-dimmed">No notifications</p>
    </div>

    <!-- Notification list -->
    <div v-else class="max-h-80 overflow-y-auto">
      <button
        v-for="notification in displayedNotifications"
        :key="notification.id"
        type="button"
        class="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors duration-150 hover:bg-muted/50"
        :class="{ 'bg-primary/5 dark:bg-primary/5': !notification.isRead }"
        @click="onClickNotification(notification)"
      >
        <!-- Icon -->
        <div class="mt-0.5 shrink-0">
          <UIcon
            :name="getNotificationIcon(notification.type)"
            class="size-4"
            :class="getNotificationIconColor(notification.type)"
          />
        </div>

        <!-- Content -->
        <div class="min-w-0 flex-1">
          <p
            class="text-sm"
            :class="notification.isRead ? 'text-muted' : 'text-default font-medium'"
          >
            {{ notification.message }}
          </p>
          <p class="mt-0.5 text-xs text-dimmed">
            {{ formatRelativeTime(notification.createdAt) }}
          </p>
        </div>

        <!-- Unread dot -->
        <div
          v-if="!notification.isRead"
          class="mt-1.5 size-2 shrink-0 rounded-full bg-primary"
        />
      </button>
    </div>
  </div>
</template>
