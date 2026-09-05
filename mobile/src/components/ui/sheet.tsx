import { createContext, useContext, type ReactNode } from 'react';
import { Modal } from 'react-native';
import { Pressable, Text, View } from 'react-native-css/components';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { X } from 'lucide-react-native';

import { Icon } from '@/components/icon';

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
 * enters from the bottom. Modal's own `slide` animation is the native one, which
 * is why there is no gesture library behind this.
 */
export function Sheet({ open, onOpenChange, children }: SheetProps) {
  return (
    <SheetContext.Provider value={{ onOpenChange }}>
      <Modal
        visible={open}
        transparent
        animationType="slide"
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
  return (
    <Text className={cn('font-sans-semibold text-base text-card-foreground', className)}>
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
  return <Text className={cn('text-sm text-muted-foreground', className)}>{children}</Text>;
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

  return (
    <View className="flex-1 justify-end">
      <Scrim
        accessibilityLabel="Close sheet"
        onPress={() => onOpenChange(false)}
      />

      <View
        className={cn(
          'max-h-[88%] rounded-t-2xl border-t border-border bg-card px-5 pt-5',
          className
        )}
        style={{ paddingBottom: insets.bottom + 20 }}>
        {/* Grab handle: the affordance that says this panel came up from the edge. */}
        <View className="mb-4 h-1 w-10 self-center rounded-full bg-border" />
        {children}
        {hideClose ? null : (
          <SheetClose accessibilityLabel="Close" className="absolute right-4 top-4 rounded-md p-1">
            <Icon icon={X} size={16} strokeWidth={2} className="text-muted-foreground" />
          </SheetClose>
        )}
      </View>
    </View>
  );
}
