// cn.ts is NOT tailwind-merge — a caller's className competes by CSS
// specificity, it does not replace. Any variant that needs to differ gets an
// entry here, never an override.
import type { ReactNode } from 'react';
import { Text, View } from 'react-native-css/components';

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
  return (
    <View
      className={cn(
        'flex-row items-center self-start rounded-full px-2 py-0.5',
        SURFACE[variant],
        className
      )}>
      {typeof children === 'string' ? (
        <Text className={cn('font-sans-medium text-[11px] uppercase', INK[variant])}>
          {children}
        </Text>
      ) : (
        children
      )}
    </View>
  );
}
