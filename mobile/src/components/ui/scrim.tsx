import { useEffect } from 'react';
import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Pressable, View } from 'react-native-css/components';
import { BlurView } from 'expo-blur';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';

import { useBlurTarget } from './blur-target';

export interface ScrimProps {
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  blurTarget?: React.RefObject<any>;
  animated?: boolean;
}

/**
 * The app's canonical scrim + backdrop overlay.
 * Darkens (rgba(0, 0, 0, 0.45)) and blurs the underlying content matching the web
 * app's backdrop-blur-[1px] scrim standard across SpeedDial, Sheet, Dialog, and
 * Popover overlays.
 *
 * Both the blur layer and the darken layer are nested in a coordinated Reanimated
 * container fading from 0 to 1 over 180ms, eliminating any native Android blur
 * initialization delay and guaranteeing darken and blur appear in 100% lockstep.
 */
export function Scrim({
  onPress,
  accessibilityLabel = 'Close',
  style,
  intensity = 20,
  blurTarget: propBlurTarget,
  animated = true,
}: ScrimProps) {
  const contextBlurTarget = useBlurTarget();
  const blurTarget = propBlurTarget ?? contextBlurTarget;

  const opacity = useSharedValue(animated ? 0 : 1);

  useEffect(() => {
    if (animated) {
      opacity.value = withTiming(1, {
        duration: 180,
        easing: Easing.out(Easing.ease),
      });
    } else {
      opacity.value = 1;
    }
  }, [animated, opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[StyleSheet.absoluteFill, style]}>
      <Animated.View
        style={[StyleSheet.absoluteFill, animatedStyle]}
        pointerEvents="none">
        <BlurView
          intensity={intensity}
          tint="dark"
          blurMethod="dimezisBlurView"
          blurTarget={blurTarget ?? undefined}
          style={StyleSheet.absoluteFill}
        />
        <View
          style={[
            StyleSheet.absoluteFill,
            { backgroundColor: 'rgba(0, 0, 0, 0.45)' },
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

