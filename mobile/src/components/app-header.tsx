import { Pressable, Text, View } from 'react-native-css/components';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search, User } from 'lucide-react-native';

import { Icon } from '@/components/icon';

/**
 * Editorial screen header. Search is an icon and the account menu (profile,
 * personas, settings) hangs off the avatar rather than taking a tab — d-0cd3wr,
 * mirroring the web app's AccountMenu. Both are inert until C7 / C9 land.
 */
export function AppHeader({ title }: { title: string }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-center justify-between px-5 pb-3"
      style={{ paddingTop: insets.top + 8 }}>
      <Text className="font-serif text-[30px] leading-[34px] text-foreground">{title}</Text>
      <View className="flex-row items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search"
          className="h-9 w-9 items-center justify-center rounded-full">
          <Icon icon={Search} size={20} strokeWidth={1.75} className="text-muted-foreground" />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Account"
          className="h-9 w-9 items-center justify-center rounded-full border border-border bg-secondary">
          <Icon icon={User} size={18} strokeWidth={1.75} className="text-muted-foreground" />
        </Pressable>
      </View>
    </View>
  );
}
