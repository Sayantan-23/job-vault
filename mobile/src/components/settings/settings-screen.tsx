import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import {
  Bell,
  BellOff,
  ChevronLeft,
  ExternalLink,
  Info,
  LogOut,
  Moon,
  Monitor,
  Shield,
  Sun,
  User,
} from 'lucide-react-native';
import { Linking, ScrollView } from 'react-native';
import { Pressable, Text, View } from 'react-native-css/components';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { IconButton } from '@/components/ui/icon-button';
import {
  SegmentedControl,
  type SegmentedOption,
} from '@/components/ui/segmented-control';
import { APP_CONFIG } from '@/config/app';
import { useAuth } from '@/hooks/use-auth';
import { useTheme, type Theme } from '@/hooks/use-theme';
import {
  getPushStatusAsync,
  getStoredPushTokenAsync,
  isPushSupported,
  registerForPushNotificationsAsync,
  unregisterPushTokenAsync,
} from '@/lib/push-notifications';
import { useSession } from '@/lib/session';

const THEME_OPTIONS: readonly SegmentedOption<Theme>[] = [
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
  { value: 'system', label: 'System', icon: Monitor },
];

function SettingRow({
  label,
  value,
  children,
}: {
  label: string;
  value?: string;
  children?: React.ReactNode;
}) {
  return (
    <View className="flex-row items-center justify-between gap-4 py-3">
      <Text className="text-sm text-muted-foreground">{label}</Text>
      {value ? (
        <Text numberOfLines={1} className="min-w-0 font-sans-medium text-sm text-foreground">
          {value}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}

export function SettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const session = useSession();
  const user = session.status === 'signedIn' ? session.user : null;
  const { logout, pending: isLoggingOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const queryClient = useQueryClient();

  const { data: pushData } = useQuery({
    queryKey: ['push-notification-settings'],
    queryFn: async () => {
      const [status, token] = await Promise.all([
        getPushStatusAsync(),
        getStoredPushTokenAsync(),
      ]);
      return { status, hasToken: Boolean(token) };
    },
  });

  const togglePushMutation = useMutation({
    mutationFn: async (currentlyEnabled: boolean) => {
      if (currentlyEnabled) {
        await unregisterPushTokenAsync();
      } else {
        await registerForPushNotificationsAsync();
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['push-notification-settings'] });
    },
  });

  const pushStatus = pushData?.status ?? 'undetermined';
  const hasToken = pushData?.hasToken ?? false;
  const pushEnabled = isPushSupported() && (pushStatus === 'granted' || hasToken);
  const isUpdatingPush = togglePushMutation.isPending;

  const handleTogglePush = () => {
    togglePushMutation.mutate(pushEnabled);
  };

  const handleOpenLink = async (url: string) => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
      }
    } catch {
      // Ignored
    }
  };

  return (
    <View className="flex-1 bg-background">
      {/* Top Header */}
      <View
        className="border-b border-border bg-card px-4 pb-3"
        style={{ paddingTop: insets.top + 8 }}>
        <View className="flex-row items-center gap-2">
          <IconButton
            icon={ChevronLeft}
            accessibilityLabel="Back"
            onPress={() => router.back()}
          />
          <View className="min-w-0 flex-1">
            <Text numberOfLines={1} className="font-serif text-2xl font-bold text-foreground">
              Settings
            </Text>
            <Text numberOfLines={1} className="text-xs text-muted-foreground">
              Manage appearance, account, and preferences
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 40,
        }}
        className="flex-1">
        <View className="gap-5">
          {/* Account Section */}
          <Card>
            <View className="mb-3 flex-row items-center gap-2">
              <Icon icon={User} size={18} className="text-foreground" />
              <Text className="font-sans-medium text-base text-foreground">Account</Text>
            </View>
            <View className="divide-y divide-border">
              <SettingRow label="Name" value={user?.name?.trim() || '—'} />
              <SettingRow label="Email" value={user?.email || '—'} />
            </View>
            <View className="mt-4 flex-row items-center justify-between border-t border-border pt-4">
              <Button
                variant="outline"
                size="sm"
                accessibilityLabel="Edit profile"
                onPress={() => router.push('/profile' as any)}>
                Edit profile →
              </Button>
              <Button
                variant="softDestructive"
                size="sm"
                icon={LogOut}
                disabled={isLoggingOut}
                accessibilityLabel="Sign out"
                onPress={() => void logout()}>
                {isLoggingOut ? 'Signing out…' : 'Sign out'}
              </Button>
            </View>
          </Card>

          {/* Appearance Section */}
          <Card>
            <View className="mb-3 flex-row items-center gap-2">
              <Icon icon={Sun} size={18} className="text-foreground" />
              <Text className="font-sans-medium text-base text-foreground">Appearance</Text>
            </View>
            <Text className="mb-3 text-xs text-muted-foreground">
              Choose your theme. System follows your device&apos;s light or dark display settings.
            </Text>
            <SegmentedControl<Theme>
              value={theme}
              onValueChange={setTheme}
              options={THEME_OPTIONS}
              aria-label="Theme selector"
              fullWidth
            />
          </Card>

          {/* Push Notifications Section */}
          <Card>
            <View className="mb-3 flex-row items-center justify-between">
              <View className="flex-row items-center gap-2">
                <Icon
                  icon={pushEnabled ? Bell : BellOff}
                  size={18}
                  className="text-foreground"
                />
                <Text className="font-sans-medium text-base text-foreground">
                  Push Notifications
                </Text>
              </View>
              <Badge variant={pushEnabled ? 'default' : 'secondary'}>
                {pushEnabled ? 'Active' : 'Off'}
              </Badge>
            </View>
            <Text className="mb-4 text-xs text-muted-foreground">
              Instant alerts when an application needs follow-up, status changes occur, or
              reminders trigger.
            </Text>
            <View className="flex-row items-center justify-between border-t border-border pt-3">
              <Text className="text-sm text-foreground">
                {pushEnabled ? 'Notifications enabled' : 'Notifications disabled'}
              </Text>
              <Button
                size="sm"
                variant={pushEnabled ? 'outline' : 'default'}
                disabled={isUpdatingPush}
                accessibilityLabel={
                  pushEnabled ? 'Turn off push notifications' : 'Enable push notifications'
                }
                onPress={() => void handleTogglePush()}>
                {isUpdatingPush
                  ? 'Updating…'
                  : pushEnabled
                    ? 'Turn off'
                    : 'Enable'}
              </Button>
            </View>
          </Card>

          {/* About & Identity Section */}
          <Card>
            <View className="mb-3 flex-row items-center gap-2">
              <Icon icon={Info} size={18} className="text-foreground" />
              <Text className="font-sans-medium text-base text-foreground">
                About {APP_CONFIG.name}
              </Text>
            </View>
            <View className="divide-y divide-border">
              <SettingRow label="Application" value={APP_CONFIG.name} />
              <SettingRow
                label="Version"
                value={`${APP_CONFIG.version} (${APP_CONFIG.buildNumber})`}
              />
              <SettingRow label="Package" value={APP_CONFIG.packageId} />
            </View>
            <View className="mt-4 flex-row flex-wrap items-center gap-4 border-t border-border pt-4">
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Privacy Policy"
                onPress={() => void handleOpenLink(APP_CONFIG.links.privacy)}
                className="flex-row items-center gap-1 active:opacity-70">
                <Icon icon={Shield} size={14} className="text-muted-foreground" />
                <Text className="text-xs text-primary underline">Privacy Policy</Text>
              </Pressable>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Terms of Service"
                onPress={() => void handleOpenLink(APP_CONFIG.links.terms)}
                className="flex-row items-center gap-1 active:opacity-70">
                <Icon icon={ExternalLink} size={14} className="text-muted-foreground" />
                <Text className="text-xs text-primary underline">Terms</Text>
              </Pressable>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel="Website"
                onPress={() => void handleOpenLink(APP_CONFIG.links.website)}
                className="flex-row items-center gap-1 active:opacity-70">
                <Icon icon={ExternalLink} size={14} className="text-muted-foreground" />
                <Text className="text-xs text-primary underline">Website</Text>
              </Pressable>
            </View>
          </Card>
        </View>
      </ScrollView>
    </View>
  );
}
