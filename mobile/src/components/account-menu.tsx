import { LogOut, User, Users } from 'lucide-react-native';
import { Text, View } from 'react-native-css/components';
import { useRouter } from 'expo-router';

import { Icon } from '@/components/icon';
import {
  AnchoredPopover,
  AnchoredPopoverClose,
  AnchoredPopoverContent,
  AnchoredPopoverTrigger,
} from '@/components/ui/anchored-popover';
import { MonogramAvatar } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { useSession } from '@/lib/session';

const ITEM = 'flex-row items-center gap-2.5 rounded-md px-2.5 py-2.5 active:opacity-70';

/**
 * The account menu behind the header avatar, mirroring the web's
 * `layout/app/account-menu.tsx`. Navigates to Profile, Personas, and provides
 * Sign out.
 */
export function AccountMenu() {
  const router = useRouter();
  const session = useSession();
  const user = session.status === 'signedIn' ? session.user : null;
  const name = user?.name.trim() || 'Account';
  const { logout } = useAuth();

  return (
    <AnchoredPopover>
      <AnchoredPopoverTrigger accessibilityLabel="Open account menu" className="rounded-full">
        <MonogramAvatar name={name} className="size-9 rounded-full" />
      </AnchoredPopoverTrigger>
      <AnchoredPopoverContent align="end">
        <View className="flex-row items-center gap-2.5 px-2.5 py-2">
          <MonogramAvatar name={name} />
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="font-sans-medium text-sm text-foreground">
              {name}
            </Text>
            {user?.email ? (
              <Text numberOfLines={1} className="text-xs text-muted-foreground">
                {user.email}
              </Text>
            ) : null}
          </View>
        </View>
        <View className="my-1 h-px bg-border" />
        <AnchoredPopoverClose
          accessibilityLabel="Profile"
          onPress={() => router.push('/profile' as any)}
          className={ITEM}>
          <Icon icon={User} size={16} strokeWidth={1.75} className="text-muted-foreground" />
          <Text className="text-sm text-foreground">Profile</Text>
        </AnchoredPopoverClose>
        <AnchoredPopoverClose
          accessibilityLabel="Personas"
          onPress={() => router.push('/personas' as any)}
          className={ITEM}>
          <Icon icon={Users} size={16} strokeWidth={1.75} className="text-muted-foreground" />
          <Text className="text-sm text-foreground">Personas</Text>
        </AnchoredPopoverClose>
        <View className="my-1 h-px bg-border" />
        <AnchoredPopoverClose
          accessibilityLabel="Sign out"
          onPress={() => void logout()}
          className={ITEM}>
          <Icon icon={LogOut} size={16} strokeWidth={1.75} className="text-muted-foreground" />
          <Text className="text-sm text-foreground">Sign out</Text>
        </AnchoredPopoverClose>
      </AnchoredPopoverContent>
    </AnchoredPopover>
  );
}
