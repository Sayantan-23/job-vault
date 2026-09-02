import { Text, View } from 'react-native-css/components';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search } from 'lucide-react-native';

import { AccountMenu } from '@/components/account-menu';
import { IconButton } from '@/components/ui/icon-button';

/**
 * Editorial screen header. Search is an icon and the account menu (sign out now,
 * profile and settings once they exist) hangs off the avatar rather than taking a
 * tab — d-0cd3wr, mirroring the web app's AccountMenu. Search is inert until C7.
 */
export function AppHeader({ title }: { title: string }) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-center justify-between px-5 pb-3"
      style={{ paddingTop: insets.top + 8 }}>
      <Text className="font-serif text-[30px] leading-[34px] text-foreground">{title}</Text>
      <View className="flex-row items-center gap-2">
        <IconButton icon={Search} accessibilityLabel="Search" />
        <AccountMenu />
      </View>
    </View>
  );
}
