import type { ReactNode } from 'react';
import type { TextStyle, ViewStyle } from 'react-native';
import { Text, View } from 'react-native-css/components';

import { useTheme } from '@/hooks/use-theme';
import { LIGHT_COLORS } from '@/theme';

import { cn } from './cn';

export type BadgeVariant =
  | 'default'
  | 'secondary'
  | 'outline'
  | 'ghost-active'
  | 'ghost-stale'
  | 'ghost-ghosted';

export type BadgeProps = {
  children?: ReactNode;
  variant?: BadgeVariant;
  className?: string;
};

/**
 * React Native does not inherit colour from a View down into a Text, so each
 * variant is two classes (surface on the View, ink on the Text) — the same
 * split as Button. Ghost variants map to the status tokens in global.css.
 */
const SURFACE: Record<BadgeVariant, string> = {
  default: 'bg-primary/10',
  secondary: 'bg-secondary',
  outline: 'border border-border bg-background',
  'ghost-active': 'bg-ghost-active/15',
  'ghost-stale': 'bg-ghost-stale/15',
  'ghost-ghosted': 'bg-ghost-ghosted/15',
};

const INK: Record<BadgeVariant, string> = {
  default: 'text-primary',
  secondary: 'text-secondary-foreground',
  outline: 'text-foreground',
  'ghost-active': 'text-ghost-active',
  'ghost-stale': 'text-ghost-stale',
  'ghost-ghosted': 'text-ghost-ghosted',
};

export function Badge({ children, variant = 'default', className }: BadgeProps) {
  const { colors = LIGHT_COLORS } = useTheme() ?? {};

  const surfaceStyles: Record<BadgeVariant, ViewStyle> = {
    default: { backgroundColor: `${colors.primary}25` },
    secondary: { backgroundColor: colors.secondary },
    outline: { borderColor: colors.border, backgroundColor: colors.background, borderWidth: 1 },
    'ghost-active': { backgroundColor: `${colors.ghostActive}25` },
    'ghost-stale': { backgroundColor: `${colors.ghostStale}25` },
    'ghost-ghosted': { backgroundColor: `${colors.ghostGhosted}25` },
  };

  const inkStyles: Record<BadgeVariant, TextStyle> = {
    default: { color: colors.primary },
    secondary: { color: colors.secondaryForeground },
    outline: { color: colors.foreground },
    'ghost-active': { color: colors.ghostActive },
    'ghost-stale': { color: colors.ghostStale },
    'ghost-ghosted': { color: colors.ghostGhosted },
  };

  return (
    <View
      style={surfaceStyles[variant]}
      className={cn(
        'flex-row items-center self-start rounded-full px-2 py-0.5',
        SURFACE[variant],
        className
      )}>
      {typeof children === 'string' ? (
        <Text
          style={inkStyles[variant]}
          className={cn('font-sans-medium text-[11px] uppercase', INK[variant])}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}
