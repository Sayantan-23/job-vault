import { useEffect } from 'react';
import { View } from 'react-native-css/components';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { cn } from './cn';

/**
 * A layout-stable placeholder block. The web sweeps a gradient across it; a
 * gradient on native needs expo-linear-gradient, so this pulses the block's
 * opacity instead — the same "still loading" read, no extra dependency.
 *
 * The animation goes on a plain Animated.View wrapping a token-styled View,
 * which is how tab-bar.tsx already combines reanimated with classNames: the two
 * layers never have to agree on a style object.
 */
export function Skeleton({ className }: { className?: string }) {
  const pulse = useSharedValue(1);

  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(0.45, { duration: 900, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
  }, [pulse]);

  const style = useAnimatedStyle(() => ({ opacity: pulse.value }));

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      className={cn('overflow-hidden rounded-md', className)}>
      <Animated.View style={[{ flex: 1 }, style]}>
        <View className="h-full w-full bg-muted" />
      </Animated.View>
    </View>
  );
}
