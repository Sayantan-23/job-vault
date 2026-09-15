import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { Modal, useWindowDimensions } from 'react-native';
import { Pressable, Text, View } from 'react-native-css/components';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { X } from 'lucide-react-native';

import { Icon } from '@/components/icon';
import { useTheme } from '@/hooks/use-theme';
import { LIGHT_COLORS } from '@/theme';

import { BlurTargetProvider } from './blur-target';
import { cn } from './cn';
import { Scrim } from './scrim';

type SheetContextValue = { onOpenChange: (open: boolean) => void };

const SheetContext = createContext<SheetContextValue>({ onOpenChange: () => {} });

export type SheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

/**
 * The web's Sheet is a right-hand drawer; on a phone the same role — a panel
 * that owns the screen without leaving it — is a bottom sheet, so this one
 * enters from the bottom.
 *
 * The Modal uses animationType="none" so its backdrop Scrim dissolves in place
 * without sliding from any direction, while SheetContent animates the panel
 * translation up from the bottom edge using Reanimated.
 */
export function Sheet({ open, onOpenChange, children }: SheetProps) {
  return (
    <SheetContext.Provider value={{ onOpenChange }}>
      <Modal
        visible={open}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => onOpenChange(false)}>
        {children}
      </Modal>
    </SheetContext.Provider>
  );
}

export function SheetTrigger({
  children,
  accessibilityLabel,
  className,
}: {
  children: ReactNode;
  accessibilityLabel?: string;
  className?: string;
}) {
  const { onOpenChange } = useContext(SheetContext);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => onOpenChange(true)}
      className={className}>
      {children}
    </Pressable>
  );
}

export function SheetClose({
  children,
  accessibilityLabel,
  className,
}: {
  children: ReactNode;
  accessibilityLabel?: string;
  className?: string;
}) {
  const { onOpenChange } = useContext(SheetContext);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => onOpenChange(false)}
      className={className}>
      {children}
    </Pressable>
  );
}

export function SheetTitle({ children, className }: { children: ReactNode; className?: string }) {
  const { colors = LIGHT_COLORS } = useTheme() ?? {};
  return (
    <Text
      style={{ color: colors.foreground }}
      className={cn('font-sans-semibold text-base text-card-foreground', className)}>
      {children}
    </Text>
  );
}

export function SheetDescription({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const { colors = LIGHT_COLORS } = useTheme() ?? {};
  return (
    <Text
      style={{ color: colors.mutedForeground }}
      className={cn('text-sm text-muted-foreground', className)}>
      {children}
    </Text>
  );
}

export function SheetContent({
  children,
  hideClose = false,
  className,
}: {
  children: ReactNode;
  hideClose?: boolean;
  className?: string;
}) {
  const insets = useSafeAreaInsets();
  const { onOpenChange } = useContext(SheetContext);
  const { height: windowHeight } = useWindowDimensions();
  const { colors = LIGHT_COLORS } = useTheme() ?? {};
  const screenHeight = windowHeight || 800;

  const maxPercent = className?.includes('max-h-[94%]')
    ? 0.94
    : className?.includes('max-h-[92%]')
      ? 0.92
      : 0.88;
  const calculatedMaxHeight = Math.round(screenHeight * maxPercent);

  const translateY = useSharedValue(screenHeight);

  useEffect(() => {
    translateY.value = withTiming(0, {
      duration: 240,
      easing: Easing.out(Easing.cubic),
    });
  }, [translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <View className="flex-1 justify-end">
      <Scrim
        accessibilityLabel="Close sheet"
        onPress={() => onOpenChange(false)}
      />

      <Animated.View
        style={[{ width: '100%' }, animatedStyle]}
        pointerEvents="box-none">
        <View
          className={cn(
            'rounded-t-2xl border-t border-border bg-card px-5 pt-5',
            className
          )}
          style={{
            backgroundColor: colors.card,
            borderTopColor: colors.hairline,
            maxHeight: calculatedMaxHeight,
            paddingBottom: insets.bottom + 20,
          }}>
          {/* Grab handle: the affordance that says this panel came up from the edge. */}
          <View style={{ backgroundColor: colors.border }} className="mb-4 h-1 w-10 self-center rounded-full bg-border" />
          <BlurTargetProvider blurTarget={null}>
            {children}
          </BlurTargetProvider>
          {hideClose ? null : (
            <SheetClose accessibilityLabel="Close" className="absolute right-4 top-4 rounded-md p-1">
              <Icon icon={X} size={16} strokeWidth={2} className="text-muted-foreground" />
            </SheetClose>
          )}
        </View>
      </Animated.View>
    </View>
  );
}
