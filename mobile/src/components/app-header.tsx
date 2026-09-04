import type { ReactNode } from 'react';
import { Text, View } from 'react-native-css/components';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Search } from 'lucide-react-native';

import { AccountMenu } from '@/components/account-menu';
import { IconButton } from '@/components/ui/icon-button';

export type AppHeaderProps = {
  title: string;
  /** Optional leading action — a filter button on the Jobs screen. Keeps the
   * one header component the single source of screen-chrome truth (d-006). */
  action?: ReactNode;
};

/**
 * Editorial screen header. Search is an icon and the account menu (sign out now,
 * profile and settings once they exist) hangs off the avatar rather than taking a
 * tab — d-0cd3wr, mirroring the web app's AccountMenu. Search is inert until C7.
 */
export function AppHeader({ title, action }: AppHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="flex-row items-center justify-between px-5 pb-3"
      style={{ paddingTop: insets.top + 8 }}>
      <View className="min-w-0 flex-row items-center gap-2">
        {action ? <View className="-ml-1">{action}</View> : null}
        <Text className="font-serif text-[30px] leading-[34px] text-foreground">{title}</Text>
      </View>
      <View className="flex-row items-center gap-2">
        <IconButton icon={Search} accessibilityLabel="Search" />
        <AccountMenu />
      </View>
    </View>
  );
}
