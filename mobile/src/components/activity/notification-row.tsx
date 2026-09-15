import { ArrowRightLeft, Bell, Ghost, Info, type LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native-css/components';

import { Icon } from '@/components/icon';
import { useTheme } from '@/hooks/use-theme';
import { relativeTime } from '@/lib/relative-time';
import type { Notification, NotificationType } from '@/types/notification';

const TYPE_ICON: Record<NotificationType, LucideIcon> = {
  GHOST_ALERT: Ghost,
  REMINDER: Bell,
  STATUS_CHANGE: ArrowRightLeft,
  GENERAL: Info,
};

export interface NotificationRowProps {
  notification: Notification;
  onSelect: (notification: Notification) => void;
}

export function NotificationRow({ notification, onSelect }: NotificationRowProps) {
  const IconComponent = TYPE_ICON[notification.type] ?? Info;
  const isGhost = notification.type === 'GHOST_ALERT';
  const { colors } = useTheme();

  return (
    <Pressable
      testID="notification-item"
      accessibilityRole="button"
      accessibilityLabel={
        notification.isRead ? notification.message : `${notification.message}, unread`
      }
      onPress={() => onSelect(notification)}
      style={{ borderBottomColor: colors.border }}
      className="flex-row items-start gap-3 border-b border-border/60 px-4 py-3.5 active:bg-muted/40">
      <View
        className={`mt-0.5 rounded-lg p-2 ${
          isGhost
            ? 'bg-ghost-ghosted/15'
            : notification.isRead
              ? 'bg-muted/70'
              : 'bg-primary/10'
        }`}>
        <Icon
          icon={IconComponent}
          size={16}
          className={
            isGhost
              ? 'text-ghost-ghosted'
              : notification.isRead
                ? 'text-muted-foreground'
                : 'text-primary'
          }
        />
      </View>

      <View className="min-w-0 flex-1 space-y-1">
        <Text
          style={{ color: notification.isRead ? colors.mutedForeground : colors.foreground }}
          className={`text-sm leading-snug ${
            notification.isRead
              ? 'font-sans text-muted-foreground'
              : 'font-sans-medium text-foreground'
          }`}>
          {notification.message}
        </Text>
        <Text
          style={{ color: colors.mutedForeground }}
          className="font-mono text-xs text-muted-foreground">
          {relativeTime(notification.createdAt)}
        </Text>
      </View>

      {!notification.isRead ? (
        <View
          testID="notification-unread-dot"
          className="mt-2 size-2 rounded-full bg-ghost-ghosted"
        />
      ) : null}
    </Pressable>
  );
}
