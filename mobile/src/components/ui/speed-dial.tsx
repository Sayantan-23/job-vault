import { useEffect, useState } from 'react';
import { StyleSheet } from 'react-native';
import { Pressable, Text, View } from 'react-native-css/components';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { Menu, X, type LucideIcon } from 'lucide-react-native';


import { Icon } from '@/components/icon';
import { Scrim } from './scrim';
import { FAB_GAP, FAB_SIZE } from '@/theme';

export interface SpeedDialAction {
  /** Optional key; defaults to action label. */
  key?: string;
  label: string;
  icon: LucideIcon;
  accessibilityLabel?: string;
  onPress: () => void;
  variant?: 'default' | 'destructive';
}

export interface SpeedDialProps {
  /** Single action or array of actions. Each page specifies icon, label, and onPress. */
  actions: SpeedDialAction[] | SpeedDialAction;
  /** Optional icon when closed. Defaults to Menu (hamburger). */
  icon?: LucideIcon;
  accessibilityLabel?: string;
  /** 0 = shown, 1 = hidden. See use-hide-on-scroll. */
  hidden?: SharedValue<number>;
  /** Bottom offset in px. Default FAB_GAP (16). */
  bottom?: number;
  /** Right offset in px. Default 20. */
  right?: number;
  /** Optional blur target for Android dimezisBlurView */
  blurTarget?: React.RefObject<any>;
}


/**
 * Single speed-dial row reproducing the web app's mobile header speed dial:
 * Google-Keep-style cascading entrance (0.18s ease-out, 40ms stagger,
 * translateY(8px) -> 0, scale 0.9 -> 1, opacity 0 -> 1) carrying both
 * an icon disc (same 56px size as FAB) and a label pill.
 */
function SpeedDialItem({
  action,
  delay,
  onPress,
}: {
  action: SpeedDialAction;
  delay: number;
  onPress: () => void;
}) {
  const isDestructive = action.variant === 'destructive';
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withTiming(1, {
        duration: 180,
        easing: Easing.out(Easing.ease),
      })
    );
  }, [delay, progress]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: interpolate(progress.value, [0, 1], [8, 0]) },
      { scale: interpolate(progress.value, [0, 1], [0.9, 1]) },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={action.accessibilityLabel ?? action.label}
        onPress={onPress}
        className="flex-row items-center justify-end gap-3 active:opacity-85">
        {/* Label pill */}
        <View
          className={
            isDestructive
              ? 'rounded-full border border-destructive/30 bg-card px-4 py-2.5 shadow-md'
              : 'rounded-full border border-hairline bg-card px-4 py-2.5 shadow-md'
          }>
          <Text
            className={
              isDestructive
                ? 'font-sans-medium text-[15px] text-destructive'
                : 'font-sans-medium text-[15px] text-foreground'
            }>
            {action.label}
          </Text>
        </View>

        {/* Icon disc - same 56px size as the FAB */}
        <View
          style={{ width: FAB_SIZE, height: FAB_SIZE }}
          className={
            isDestructive
              ? 'items-center justify-center rounded-full bg-destructive shadow-lg active:opacity-90'
              : 'items-center justify-center rounded-full border border-hairline bg-card shadow-lg active:bg-secondary'
          }>
          <Icon
            icon={action.icon}
            size={24}
            strokeWidth={2}
            className={
              isDestructive
                ? 'text-destructive-foreground'
                : 'text-foreground'
            }
          />
        </View>
      </Pressable>
    </Animated.View>
  );
}

function Backdrop({
  onPress,
  blurTarget,
}: {
  onPress: () => void;
  blurTarget?: React.RefObject<any>;
}) {
  return (
    <Scrim
      onPress={onPress}
      accessibilityLabel="Close actions"
      blurTarget={blurTarget}
    />
  );
}



export function SpeedDial({
  actions,
  icon: ClosedIcon = Menu,
  accessibilityLabel = 'Actions',
  hidden,
  bottom = FAB_GAP,
  right = 20,
  blurTarget,
}: SpeedDialProps) {
  const [open, setOpen] = useState(false);
  const rotation = useSharedValue(0);

  const actionList = Array.isArray(actions) ? actions : [actions];

  useEffect(() => {
    rotation.value = withTiming(open ? 1 : 0, {
      duration: 180,
      easing: Easing.out(Easing.ease),
    });
  }, [open, rotation]);

  const fabRotateStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value * 90}deg` }],
  }));

  const hideStyle = useAnimatedStyle(() => {
    if (!hidden || open) return {};
    return {
      opacity: 1 - hidden.value,
      transform: [{ translateY: hidden.value * (FAB_SIZE + FAB_GAP) }],
    };
  });

  if (!open) {
    return (
      <Animated.View
        style={[{ position: 'absolute', right, bottom }, hideStyle]}
        pointerEvents="box-none">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={accessibilityLabel}
          onPress={() => setOpen(true)}
          className="items-center justify-center rounded-full bg-primary shadow-lg active:opacity-90"
          style={{ width: FAB_SIZE, height: FAB_SIZE }}>
          <Animated.View style={fabRotateStyle}>
            <Icon
              icon={ClosedIcon}
              size={24}
              strokeWidth={2}
              className="text-primary-foreground"
            />
          </Animated.View>
        </Pressable>
      </Animated.View>
    );
  }

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
      {/* Backdrop / scrim click-catcher with blur + dark overlay */}
      <Backdrop onPress={() => setOpen(false)} blurTarget={blurTarget} />


      {/* Floating column of actions and main toggle */}
      <View
        style={{
          position: 'absolute',
          right,
          bottom,
          alignItems: 'flex-end',
          gap: 12,
        }}
        pointerEvents="box-none">
        {/* Actions cascading with Google Keep / web hamburger animation */}
        {actionList.map((action, index) => {
          // Stagger: items closest to the FAB (bottom) pop out first, cascading upwards
          const delay = (actionList.length - 1 - index) * 40;
          return (
            <SpeedDialItem
              key={action.key ?? action.label}
              action={action}
              delay={delay}
              onPress={() => {
                setOpen(false);
                action.onPress();
              }}
            />
          );
        })}

        {/* Main trigger button toggled to X */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close actions"
          onPress={() => setOpen(false)}
          className="items-center justify-center rounded-full bg-primary shadow-lg active:opacity-90"
          style={{ width: FAB_SIZE, height: FAB_SIZE }}>
          <Animated.View style={fabRotateStyle}>
            <Icon
              icon={X}
              size={24}
              strokeWidth={2}
              className="text-primary-foreground"
            />
          </Animated.View>
        </Pressable>
      </View>
    </View>
  );
}

/** Re-export SpeedDial as Fab so both naming styles resolve to the same unified component. */
export { SpeedDial as Fab };
