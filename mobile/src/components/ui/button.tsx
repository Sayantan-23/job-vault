import type { ReactNode } from 'react';
import { Pressable, Text } from 'react-native-css/components';

import { cn } from './cn';

export type ButtonVariant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'ghost'
  | 'destructive'
  | 'softPrimary'
  | 'softDestructive'
  | 'link';

export type ButtonSize = 'default' | 'sm' | 'lg' | 'icon' | 'iconSm';

/**
 * React Native does not inherit colour from a View down into a Text, so each
 * variant is two classes rather than the web's one: the surface goes on the
 * Pressable and the ink on the Text.
 */
const SURFACE: Record<ButtonVariant, string> = {
  default: 'bg-primary',
  secondary: 'bg-secondary',
  outline: 'border border-border bg-background',
  ghost: '',
  destructive: 'bg-destructive',
  // Tonal accents: soft fills that read as a secondary action on the warm-stone
  // canvas (the plain secondary/muted/accent tokens are near-background).
  softPrimary: 'bg-primary/10',
  softDestructive: 'bg-destructive/10',
  link: '',
};

const INK: Record<ButtonVariant, string> = {
  default: 'text-primary-foreground',
  secondary: 'text-secondary-foreground',
  outline: 'text-foreground',
  ghost: 'text-foreground',
  destructive: 'text-destructive-foreground',
  softPrimary: 'text-primary',
  softDestructive: 'text-destructive',
  link: 'text-primary underline',
};

const SIZE: Record<ButtonSize, string> = {
  default: 'h-10 px-4',
  sm: 'h-9 px-3',
  lg: 'h-11 px-8',
  icon: 'h-10 w-10',
  iconSm: 'h-8 w-8',
};

export type ButtonProps = {
  children?: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  disabled?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
  className?: string;
};

export function Button({
  children,
  variant = 'default',
  size = 'default',
  disabled = false,
  onPress,
  accessibilityLabel,
  className,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={cn(
        'flex-row items-center justify-center gap-2 rounded-md active:opacity-90',
        SURFACE[variant],
        SIZE[size],
        disabled && 'opacity-50',
        className
      )}>
      {typeof children === 'string' ? (
        <Text className={cn('font-sans-medium text-sm', INK[variant])}>{children}</Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
