import { Pressable } from 'react-native-css/components';
import Animated, { useAnimatedStyle, type SharedValue } from 'react-native-reanimated';
import { Plus } from 'lucide-react-native';

import { Icon } from '@/components/icon';
import { FAB_GAP, FAB_SIZE } from '@/theme';

export type FabProps = {
  /** 0 = shown, 1 = hidden. See use-hide-on-scroll. */
  hidden: SharedValue<number>;
  accessibilityLabel: string;
  onPress?: () => void;
};

/**
 * Raised clear above the tab bar, right side (d-0cd3wr) — it never breaks the
 * bar's top edge and never overlaps a tab target. Flat muted indigo, no drop
 * shadow: it reads as raised against the bar's hairline.
 */
export function Fab({ hidden, accessibilityLabel, onPress }: FabProps) {
  const style = useAnimatedStyle(() => ({
    opacity: 1 - hidden.value,
    transform: [{ translateY: hidden.value * (FAB_SIZE + FAB_GAP) }],
  }));

  return (
    <Animated.View
      style={[{ position: 'absolute', right: 20, bottom: FAB_GAP }, style]}
      pointerEvents="box-none">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        onPress={onPress}
        className="items-center justify-center rounded-full bg-primary"
        style={{ width: FAB_SIZE, height: FAB_SIZE }}>
        <Icon icon={Plus} size={24} strokeWidth={2} className="text-primary-foreground" />
      </Pressable>
    </Animated.View>
  );
}
