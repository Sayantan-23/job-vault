import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { View } from 'react-native-css/components';

import { useTheme } from '@/hooks/use-theme';
import { LIGHT_COLORS } from '@/theme';
import { cn } from './cn';

export type CardProps = {
  children?: ReactNode;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * The flat container of minimalist-ui: a warm-stone surface on a hairline, no
 * diffuse shadow. One component with `className` + children — a header/title/
 * content split is YAGNI until a caller needs the affordance.
 */
export function Card({ children, className, style }: CardProps) {
  const { colors = LIGHT_COLORS } = useTheme() ?? {};
  return (
    <View
      style={[{ backgroundColor: colors.card, borderColor: colors.hairline }, style]}
      className={cn(
        'rounded-md border border-hairline bg-card p-4',
        className
      )}>
      {children}
    </View>
  );
}
