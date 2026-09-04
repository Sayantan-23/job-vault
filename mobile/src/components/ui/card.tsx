import type { ReactNode } from 'react';
import { View } from 'react-native-css/components';

import { cn } from './cn';

export type CardProps = {
  children?: ReactNode;
  className?: string;
};

/**
 * The flat container of minimalist-ui: a warm-stone surface on a hairline, no
 * diffuse shadow. One component with `className` + children — a header/title/
 * content split is YAGNI until a caller needs the affordance.
 */
export function Card({ children, className }: CardProps) {
  return (
    <View
      className={cn(
        'rounded-md border border-hairline bg-card p-4',
        className
      )}>
      {children}
    </View>
  );
}
