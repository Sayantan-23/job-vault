import { useEffect, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { Pressable, Text, View } from 'react-native-css/components';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { BottomTabBarProps } from 'expo-router/tabs';
import { Archive, Briefcase, Clock, MessageSquareQuote, type LucideIcon } from 'lucide-react-native';

import { Icon } from '@/components/icon';
import { useNotifications, useUnreadNotificationCount } from '@/hooks/use-notifications';
import { useTheme } from '@/hooks/use-theme';
import { darkVars, lightVars, TAB_BAR_HEIGHT } from '@/theme';

/**
 * Four tabs, per d-0cd3wr — the six web routes regrouped. Keyed by route name so
 * the order comes from the router, not from this table.
 */
const TAB_META: Record<string, { label: string; icon: LucideIcon }> = {
  index: { label: 'Jobs', icon: Briefcase },
  answers: { label: 'Answers', icon: MessageSquareQuote },
  vault: { label: 'Vault', icon: Archive },
  activity: { label: 'Activity', icon: Clock },
};

/** Horizontal / vertical breathing room between the active capsule and its slot. */
const CAPSULE_INSET_X = 10;
const CAPSULE_INSET_Y = 6;

/** The capsule leads with one edge so it stretches across the gap instead of teleporting. */
const LEAD_MS = 200;
const TRAIL_MS = 320;

export function TabBar({ state, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const unreadCount = useUnreadNotificationCount();
  const { effectiveTheme, colors } = useTheme();
  const activeVars = effectiveTheme === 'dark' ? darkVars : lightVars;
  const barBg = colors.tabBar;
  const primaryBg = colors.primary;
  const [barWidth, setBarWidth] = useState(0);
  const slot = state.routes.length > 0 ? barWidth / state.routes.length : 0;

  const left = useSharedValue(0);
  const right = useSharedValue(0);

  useEffect(() => {
    if (slot === 0) return;
    const targetLeft = state.index * slot + CAPSULE_INSET_X;
    const targetRight = (state.index + 1) * slot - CAPSULE_INSET_X;
    // First measurement: place it, don't animate in from zero width.
    if (right.value === 0) {
      left.value = targetLeft;
      right.value = targetRight;
      return;
    }
    const forward = targetLeft > left.value;
    left.value = withTiming(targetLeft, { duration: forward ? TRAIL_MS : LEAD_MS });
    right.value = withTiming(targetRight, { duration: forward ? LEAD_MS : TRAIL_MS });
  }, [state.index, slot, left, right]);

  const capsuleStyle = useAnimatedStyle(() => ({
    left: left.value,
    width: Math.max(right.value - left.value, 0),
  }));

  return (
    // Square-edged, full-bleed and borderless: the surface difference between the page
    // and the tab bar serves as the boundary.
    <View
      key={effectiveTheme}
      className="bg-tab-bar"
      style={[activeVars, { paddingBottom: insets.bottom, backgroundColor: barBg }]}>
      <View
        className="flex-row"
        style={{ height: TAB_BAR_HEIGHT }}
        onLayout={(event: LayoutChangeEvent) => setBarWidth(event.nativeEvent.layout.width)}>
        <Animated.View
          pointerEvents="none"
          style={[
            { position: 'absolute', top: CAPSULE_INSET_Y, bottom: CAPSULE_INSET_Y },
            capsuleStyle,
          ]}>
          <View
            className="flex-1 rounded-full bg-primary"
            style={{ backgroundColor: primaryBg }}
          />
        </Animated.View>

        {state.routes.map((route, index) => {
          const meta = TAB_META[route.name];
          if (!meta) return null;
          const focused = state.index === index;
          const tone = focused ? 'text-primary-foreground' : 'text-tab-bar-muted';

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={focused ? { selected: true } : {}}
              className="flex-1 items-center justify-center gap-1"
              onPress={() => {
                const event = navigation.emit({
                  type: 'tabPress',
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name, route.params);
                }
              }}>
              <View className="relative">
                <Icon icon={meta.icon} size={20} strokeWidth={1.75} className={tone} />
                {route.name === 'activity' && unreadCount > 0 ? (
                  <View
                    testID="tab-unread-dot"
                    pointerEvents="none"
                    className="absolute -right-1.5 -top-1 size-2 rounded-full bg-ghost-ghosted"
                  />
                ) : null}
              </View>
              <Text className={`font-mono text-[10px] ${tone}`}>{meta.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
