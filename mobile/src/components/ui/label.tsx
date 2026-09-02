import type { ReactNode } from 'react';
import { Text } from 'react-native-css/components';

import { cn } from './cn';

export type LabelProps = { children: ReactNode; className?: string };

/**
 * Field label. The web's `htmlFor` has no native equivalent — a field is
 * associated with assistive tech through its own `aria-label`, not through this.
 */
export function Label({ children, className }: LabelProps) {
  return (
    <Text className={cn('font-sans-medium text-sm text-foreground', className)}>{children}</Text>
  );
}
