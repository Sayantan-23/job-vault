import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import { Modal, Platform, StatusBar, useWindowDimensions, View as RNView } from 'react-native';
import { Pressable, View } from 'react-native-css/components';
import { SafeAreaInsetsContext } from 'react-native-safe-area-context';

import { cn } from './cn';
import { Scrim } from './scrim';

type Rect = { x: number; y: number; width: number; height: number };

type PopoverContextValue = {
  open: boolean;
  anchor: Rect | null;
  setAnchor: (rect: Rect) => void;
  openPopover: () => void;
  close: () => void;
};

const PopoverContext = createContext<PopoverContextValue>({
  open: false,
  anchor: null,
  setAnchor: () => {},
  openPopover: () => {},
  close: () => {},
});

/** Matches the web's collisionPadding — the popover never touches a screen edge. */
const EDGE_PADDING = 8;

/** Matches the web's `w-60`. */
const CONTENT_WIDTH = 240;

export type AnchoredPopoverProps = {
  children: ReactNode;
  onOpenChange?: (open: boolean) => void;
};

/**
 * A popover anchored to its trigger. The web gets the positioning from Radix's
 * popper; here the trigger measures itself in window coordinates on press and
 * the content is placed against that rect inside a Modal.
 *
 * Unlike the web's Radix Root this is uncontrolled — no shipped caller drives
 * `open` from outside, and `onOpenChange` covers the reporting side.
 */
export function AnchoredPopover({ children, onOpenChange }: AnchoredPopoverProps) {
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<Rect | null>(null);

  const openPopover = useCallback(() => {
    setOpen(true);
    onOpenChange?.(true);
  }, [onOpenChange]);

  const close = useCallback(() => {
    setOpen(false);
    onOpenChange?.(false);
  }, [onOpenChange]);

  return (
    <PopoverContext.Provider value={{ open, anchor, setAnchor, openPopover, close }}>
      {children}
    </PopoverContext.Provider>
  );
}

export function AnchoredPopoverTrigger({
  children,
  accessibilityLabel,
  className,
}: {
  children: ReactNode;
  accessibilityLabel?: string;
  className?: string;
}) {
  const { setAnchor, openPopover } = useContext(PopoverContext);
  const ref = useRef<RNView>(null);

  const measure = useCallback(() => {
    ref.current?.measureInWindow((x, y, width, height) => {
      if (width > 0 || height > 0) {
        // On Android, measureInWindow returns coordinates relative to the
        // activity window (excluding the status bar), while a Modal with
        // statusBarTranslucent starts at y=0 at the top of the screen.
        // We add StatusBar.currentHeight to compensate for this offset.
        const statusBarOffset = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;
        setAnchor({ x, y: y + statusBarOffset, width, height });
      }
    });
  }, [setAnchor]);

  return (
    <RNView ref={ref} collapsable={false} onLayout={measure}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        className={className}
        onPress={() => {
          measure();
          openPopover();
        }}>
        {children}
      </Pressable>
    </RNView>
  );
}

/**
 * An item that acts and then dismisses. The web composes this with Radix
 * `asChild` over its own button; React Native has no `asChild`, so the action
 * comes in as `onPress` and this owns the press.
 */
export function AnchoredPopoverClose({
  children,
  accessibilityLabel,
  onPress,
  className,
}: {
  children: ReactNode;
  accessibilityLabel?: string;
  onPress?: () => void;
  className?: string;
}) {
  const { close } = useContext(PopoverContext);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        onPress?.();
        close();
      }}
      className={className}>
      {children}
    </Pressable>
  );
}

export function AnchoredPopoverContent({
  children,
  align = 'start',
  sideOffset = 6,
  className,
}: {
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  className?: string;
}) {
  const { open, anchor, close } = useContext(PopoverContext);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const insets = useContext(SafeAreaInsetsContext);

  if (!open) return null;

  const statusBarOffset = Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;
  const insetsTop = insets?.top ?? 0;
  const fallbackY = Math.max(insetsTop, statusBarOffset) + 8;

  const rect = anchor ?? {
    x: align === 'end' ? screenWidth - CONTENT_WIDTH - EDGE_PADDING : EDGE_PADDING,
    y: fallbackY,
    width: 36,
    height: 36,
  };
  const rawLeft =
    align === 'center'
      ? rect.x + rect.width / 2 - CONTENT_WIDTH / 2
      : align === 'end'
        ? rect.x + rect.width - CONTENT_WIDTH
        : rect.x;

  const left = Math.min(
    Math.max(rawLeft, EDGE_PADDING),
    Math.max(screenWidth - CONTENT_WIDTH - EDGE_PADDING, EDGE_PADDING)
  );
  const top = rect.y + rect.height + sideOffset;

  return (
    <Modal visible transparent animationType="fade" statusBarTranslucent onRequestClose={close}>
      <Scrim onPress={close} accessibilityLabel="Close menu" />
      <View

        // ponytail: opens downward only. A trigger low enough that the popover
        // would run off the bottom gets a scrollable, capped panel rather than a
        // flip — flipping needs the content's measured height, which is a second
        // layout pass. Add it when a caller actually sits near the bottom edge.
        className={cn('absolute rounded-xl border border-border bg-card p-1', className)}
        style={{
          left,
          top,
          width: CONTENT_WIDTH,
          maxHeight: Math.max(screenHeight - top - EDGE_PADDING, 0),
        }}>
        {children}
      </View>
    </Modal>
  );
}
