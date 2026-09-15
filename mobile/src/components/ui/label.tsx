import type { ReactNode } from 'react';
import { Text } from 'react-native-css/components';

import { useTheme } from '@/hooks/use-theme';
import { LIGHT_COLORS } from '@/theme';

import { cn } from './cn';

export type LabelProps = { children: ReactNode; className?: string };

/**
 * Field label. The web's `htmlFor` has no native equivalent — a field is
 * associated with assistive tech through its own `aria-label`, not through this.
 */
export function Label({ children, className }: LabelProps) {
  const { colors = LIGHT_COLORS } = useTheme() ?? {};
  return (
    <Text
      style={{ color: colors.foreground }}
      className={cn('font-sans-medium text-sm text-foreground', className)}>
      {children}
    </Text>
  );
}
