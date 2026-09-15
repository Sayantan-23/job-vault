import type { LucideIcon } from 'lucide-react-native';
import { ActivityIndicator } from 'react-native';
import { Pressable } from 'react-native-css/components';
import Animated, {
  useAnimatedStyle,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { LIGHT_COLORS, useTheme } from '@/hooks/use-theme';
import { cn } from './cn';
import { FAB_GAP, FAB_SIZE } from '@/theme';

export interface FabProps {
  /** The Lucide icon to render centered inside the FAB */
  icon: LucideIcon;
  /** Accessibility label for screen readers and test queries */
  accessibilityLabel: string;
  /** Handler called when the FAB is pressed */
  onPress: () => void;
  /** Whether the FAB is disabled */
  disabled?: boolean;
  /** Whether the action is currently in flight (shows loading spinner) */
  loading?: boolean;
  /** SharedValue from useHideOnScroll (0 = shown, 1 = hidden) */
  hidden?: SharedValue<number>;
  /** Bottom position offset in pixels. Defaults to safe bottom inset + FAB_GAP. */
  bottom?: number;
  /** Right position offset in pixels. Defaults to 20. */
  right?: number;
  /** Surface variant. Defaults to 'default' (primary token). */
  variant?: 'default' | 'destructive';
  testID?: string;
  className?: string;
}

/**
 * A standard, high-contrast single-action Floating Action Button (FAB).
 * Unlike SpeedDial which expands into a cascade of secondary actions,
 * Fab executes a single unambiguous primary action (Save, New, etc.) directly on tap.
 */
export function Fab({
  icon,
  accessibilityLabel,
  onPress,
  disabled = false,
  loading = false,
  hidden,
  bottom,
  right = 20,
  variant = 'default',
  testID,
  className,
}: FabProps) {
  const { colors = LIGHT_COLORS } = useTheme() ?? {};
  const insets = useSafeAreaInsets();
  const effectiveBottom = bottom ?? Math.max(insets.bottom, 16) + FAB_GAP;

  const hideStyle = useAnimatedStyle(() => {
    if (!hidden) return {};
    return {
      opacity: 1 - hidden.value,
      transform: [{ translateY: hidden.value * (FAB_SIZE + FAB_GAP) }],
    };
  });

  const isDestructive = variant === 'destructive';
  const surfaceClass = isDestructive ? 'bg-destructive' : 'bg-primary';
  const inkClass = isDestructive
    ? 'text-destructive-foreground'
    : 'text-primary-foreground';

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          right,
          bottom: effectiveBottom,
          zIndex: 40,
        },
        hideStyle,
      ]}
      pointerEvents="box-none">
      <Pressable
        testID={testID}
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        accessibilityState={{ disabled: disabled || loading }}
        disabled={disabled || loading}
        onPress={onPress}
        className={cn(
          'items-center justify-center rounded-full shadow-lg active:opacity-90 active:scale-95',
          surfaceClass,
          (disabled || loading) && 'opacity-50',
          className
        )}
        style={{
          width: FAB_SIZE,
          height: FAB_SIZE,
          backgroundColor: isDestructive ? colors.destructive : colors.primary,
        }}>
        {loading ? (
          <ActivityIndicator
            size="small"
            color={isDestructive ? colors.destructiveForeground : colors.primaryForeground}
          />
        ) : (
          <Icon
            icon={icon}
            size={24}
            strokeWidth={2}
            color={isDestructive ? colors.destructiveForeground : colors.primaryForeground}
            className={inkClass}
          />
        )}
      </Pressable>
    </Animated.View>
  );
}
