import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Pressable, View } from 'react-native-css/components';
import { BlurView } from 'expo-blur';

import { useBlurTarget } from './blur-target';

export interface ScrimProps {
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  intensity?: number;
  blurTarget?: React.RefObject<any>;
}

/**
 * The app's canonical scrim + backdrop overlay.
 * Darkens (rgba(0, 0, 0, 0.45)) and blurs the underlying content matching the web
 * app's backdrop-blur-[1px] scrim standard across SpeedDial, Sheet, Dialog, and
 * Popover overlays.
 */
export function Scrim({
  onPress,
  accessibilityLabel = 'Close',
  style,
  intensity = 40,
  blurTarget: propBlurTarget,
}: ScrimProps) {
  const contextBlurTarget = useBlurTarget();
  const blurTarget = propBlurTarget ?? contextBlurTarget;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={[StyleSheet.absoluteFill, style]}>
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
    </Pressable>
  );
}
