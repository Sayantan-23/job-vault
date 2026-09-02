import type { LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native-css/components';

import { Icon } from '@/components/icon';

import { cn } from './cn';

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
  icon?: LucideIcon;
};

export type SegmentedControlProps<T extends string> = {
  value: T;
  onValueChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  className?: string;
  'aria-label'?: string;
  /** Hide text labels below the sm breakpoint (icons must be provided). */
  collapseLabels?: boolean;
};

export function SegmentedControl<T extends string>({
  value,
  onValueChange,
  options,
  className,
  'aria-label': ariaLabel,
  collapseLabels = false,
}: SegmentedControlProps<T>) {
  return (
    <View
      accessibilityRole="tablist"
      accessibilityLabel={ariaLabel}
      className={cn(
        'h-10 flex-row items-center gap-1 self-start rounded-lg border border-border bg-muted/50 p-1',
        className
      )}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityLabel={option.label}
            accessibilityState={{ selected: active }}
            onPress={() => onValueChange(option.value)}
            className={cn(
              'h-full flex-row items-center gap-1.5 rounded-md px-3',
              active && 'bg-background'
            )}>
            {option.icon ? (
              <Icon
                icon={option.icon}
                size={16}
                strokeWidth={1.75}
                className={active ? 'text-foreground' : 'text-muted-foreground'}
              />
            ) : null}
            <Text
              // `sm:inline` has no meaning in React Native's layout model; the
              // collapse is expressed as hidden → flex, which behaves the same.
              className={cn(
                'font-sans-medium text-sm',
                active ? 'text-foreground' : 'text-muted-foreground',
                collapseLabels && 'hidden sm:flex'
              )}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
