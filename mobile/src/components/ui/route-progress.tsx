import { useEffect } from 'react';
import { View } from 'react-native-css/components';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

/**
 * The thin top progress bar shown while a screen is waiting on its first fetch.
 * Mount it with the wait and unmount it when the data lands — vanishing reads as
 * "done". It trickles toward ~92% and holds, so it never claims to have
 * finished. Same contract as the web's RouteProgress, driven by mount/unmount
 * rather than by router events.
 */
export function RouteProgress() {
  const progress = useSharedValue(0);

  useEffect(() => {
    // Jump to a visible head first — a bar that sits at zero for a second reads
    // as broken rather than as busy — then trickle.
    progress.value = withSequence(
      withTiming(0.3, { duration: 250, easing: Easing.out(Easing.quad) }),
      withTiming(0.92, { duration: 8000, easing: Easing.out(Easing.quad) })
    );
  }, [progress]);

  const style = useAnimatedStyle(() => ({ transform: [{ scaleX: progress.value }] }));

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      className="absolute inset-x-0 top-0 h-0.5 overflow-hidden">
      <Animated.View style={[{ flex: 1, transformOrigin: 'left' }, style]}>
        <View className="h-full w-full bg-primary" />
      </Animated.View>
    </View>
  );
}
