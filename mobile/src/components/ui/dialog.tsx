import { createContext, useContext, useEffect, type ReactNode } from 'react';
import { Modal } from 'react-native';
import { Pressable, Text, View } from 'react-native-css/components';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { X } from 'lucide-react-native';

import { Icon } from '@/components/icon';

import { cn } from './cn';
import { Scrim } from './scrim';

type DialogContextValue = { onOpenChange: (open: boolean) => void };

const DialogContext = createContext<DialogContextValue>({ onOpenChange: () => {} });

export type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: ReactNode;
};

/**
 * Same split as the web's Radix build: Dialog holds the state and renders
 * nothing, DialogContent does the portalling. React Native's Modal *is* the
 * portal — it also wires the Android hardware back button through
 * onRequestClose, which is the native equivalent of Escape.
 */
export function Dialog({ open, onOpenChange, children }: DialogProps) {
  return (
    <DialogContext.Provider value={{ onOpenChange }}>
      <Modal
        visible={open}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => onOpenChange(false)}>
        {children}
      </Modal>
    </DialogContext.Provider>
  );
}


export function DialogTrigger({
  children,
  accessibilityLabel,
  className,
}: {
  children: ReactNode;
  accessibilityLabel?: string;
  className?: string;
}) {
  const { onOpenChange } = useContext(DialogContext);
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

export function DialogClose({
  children,
  accessibilityLabel,
  className,
}: {
  children: ReactNode;
  accessibilityLabel?: string;
  className?: string;
}) {
  const { onOpenChange } = useContext(DialogContext);
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

export function DialogTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Text className={cn('font-sans-semibold text-base text-card-foreground', className)}>
      {children}
    </Text>
  );
}

export function DialogDescription({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <Text className={cn('text-sm text-muted-foreground', className)}>{children}</Text>;
}

/**
 * The app's one scrim treatment. Exported because a surface that restyles
 * DialogContent (the search palette on the web) still wants this behind it.
 */
export function DialogOverlay() {
  const { onOpenChange } = useContext(DialogContext);
  return (
    <Scrim
      accessibilityLabel="Close dialog"
      onPress={() => onOpenChange(false)}
    />
  );
}


export function DialogContent({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0.96);

  useEffect(() => {
    opacity.value = withTiming(1, {
      duration: 180,
      easing: Easing.out(Easing.ease),
    });
    scale.value = withTiming(1, {
      duration: 180,
      easing: Easing.out(Easing.ease),
    });
  }, [opacity, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  return (
    <View className="flex-1 items-center justify-center px-4">
      <DialogOverlay />
      <Animated.View
        style={animatedStyle}
        className={cn(
          'w-full max-w-lg gap-4 rounded-xl border border-border bg-card p-6',
          className
        )}>
        {children}
        <DialogClose accessibilityLabel="Close" className="absolute right-4 top-4 rounded-md p-1">
          <Icon icon={X} size={16} strokeWidth={2} className="text-muted-foreground" />
        </DialogClose>
      </Animated.View>
    </View>
  );
}

