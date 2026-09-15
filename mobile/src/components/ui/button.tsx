import type { ReactNode } from 'react';
import type { TextStyle, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { Pressable, Text } from 'react-native-css/components';

import { Icon } from '@/components/icon';
import { useTheme } from '@/hooks/use-theme';
import { LIGHT_COLORS } from '@/theme';
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
  icon?: LucideIcon;
  iconSize?: number;
};

export function Button({
  children,
  variant = 'default',
  size = 'default',
  disabled = false,
  onPress,
  accessibilityLabel,
  className,
  icon,
  iconSize,
}: ButtonProps) {
  const { colors = LIGHT_COLORS } = useTheme() ?? {};

  const surfaceStyles: Partial<Record<ButtonVariant, ViewStyle>> = {
    default: { backgroundColor: colors.primary },
    secondary: { backgroundColor: colors.secondary },
    outline: { borderColor: colors.border, backgroundColor: colors.background, borderWidth: 1 },
    destructive: { backgroundColor: colors.destructive },
    softPrimary: { backgroundColor: `${colors.primary}20` },
    softDestructive: { backgroundColor: `${colors.destructive}20` },
  };

  const inkStyles: Record<ButtonVariant, TextStyle> = {
    default: { color: colors.primaryForeground },
    secondary: { color: colors.secondaryForeground },
    outline: { color: colors.foreground },
    ghost: { color: colors.foreground },
    destructive: { color: colors.destructiveForeground },
    softPrimary: { color: colors.primary },
    softDestructive: { color: colors.destructive },
    link: { color: colors.primary },
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={surfaceStyles[variant]}
      className={cn(
        'flex-row items-center justify-center gap-2 rounded-md active:opacity-90',
        SURFACE[variant],
        SIZE[size],
        disabled && 'opacity-50',
        className
      )}>
      {icon ? (
        <Icon
          icon={icon}
          size={iconSize ?? (size === 'sm' || size === 'iconSm' ? 14 : 16)}
          color={inkStyles[variant].color}
          className={INK[variant]}
        />
      ) : null}
      {typeof children === 'string' ? (
        <Text
          style={inkStyles[variant]}
          className={cn('font-sans-medium text-sm', INK[variant])}>
          {children}
        </Text>
      ) : (
        children
      )}
    </Pressable>
  );
}
