import { useRouter } from 'expo-router';
import { Bell, Search } from 'lucide-react-native';
import { Text, View } from 'react-native-css/components';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AccountMenu } from '@/components/account-menu';
import { IconButton } from '@/components/ui/icon-button';
import { useUnreadNotificationCount } from '@/hooks/use-notifications';

export type AppHeaderProps = {
  title: string;
};

/**
 * Editorial screen header. Search is a top-level icon opening the search screen,
 * Notifications is a top-level bell taking the user directly to the Activity
 * tab's notifications feed, and the account menu hangs off the avatar rather
 * than taking a tab — d-0cd3wr, mirroring the web app's AccountMenu.
 *
 * Headers never carry leading action buttons — all screen-level actions live in
 * the bottom-right floating SpeedDial (d-0cqv2p).
 */
export function AppHeader({ title }: AppHeaderProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const unreadCount = useUnreadNotificationCount();

  const handleNotificationsPress = () => {
    router.navigate({
      pathname: '/(tabs)/activity',
      params: { filter: 'notifications' },
    });
  };

  return (
    <View
      className="flex-row items-center justify-between px-5 pb-3"
      style={{ paddingTop: insets.top + 8 }}>
      <View className="min-w-0 flex-row items-center gap-2">
        <Text className="font-serif text-[30px] leading-[34px] text-foreground">{title}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <IconButton
          icon={Search}
          accessibilityLabel="Search"
          onPress={() => router.push('/search' as any)}
        />
        <View className="relative">
          <IconButton
            icon={Bell}
            accessibilityLabel={
              unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'
            }
            onPress={handleNotificationsPress}
            testID="header-notification-button"
          />
          {unreadCount > 0 ? (
            <View
              testID="header-unread-dot"
              pointerEvents="none"
              className="absolute right-1.5 top-1.5 size-2 rounded-full bg-ghost-ghosted ring-2 ring-background"
            />
          ) : null}
        </View>
        <AccountMenu />
      </View>
    </View>
  );
}
