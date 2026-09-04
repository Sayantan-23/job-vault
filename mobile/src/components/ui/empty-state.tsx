import type { ReactNode } from 'react';
import { Text, View } from 'react-native-css/components';

import { cn } from './cn';

export type EmptyStateProps = {
  title: string;
  description?: string;
  /** Optional action node — a Reset button for the filtered variant, nothing
   * for the bare "no jobs yet" variant. Two visual shapes via props, not two
   * components. */
  action?: ReactNode;
  className?: string;
};

/**
 * The two web variants (filtered "No jobs match" + Reset, vs "No jobs yet")
 * are driven by props on this one component. The title is serif to match the
 * editorial tone; re-implemented on our tokens, not ported DOM.
 */
export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <View className={cn('items-center px-6 py-16', className)}>
      <Text className="font-serif text-xl text-foreground text-center">{title}</Text>
      {description ? (
        <Text className="mt-2 text-center text-sm text-muted-foreground">
          {description}
        </Text>
      ) : null}
      {action ? <View className="mt-5">{action}</View> : null}
    </View>
  );
}
