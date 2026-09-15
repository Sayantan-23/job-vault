import { useState } from 'react';
import { Check, ChevronDown } from 'lucide-react-native';
import { Pressable, ScrollView, Text } from 'react-native-css/components';

import { Icon } from '@/components/icon';
import { useTheme } from '@/hooks/use-theme';
import { LIGHT_COLORS } from '@/theme';

import { cn } from './cn';
import { Sheet, SheetContent, SheetTitle } from './sheet';

export type SelectOption<T extends string> = { value: T; label: string };

export type SelectProps<T extends string> = {
  value: T | undefined;
  onValueChange: (value: T) => void;
  options: readonly SelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  'aria-label'?: string;
  className?: string;
};

/**
 * The web is a styled `<select>`, which relies on the browser's own option list.
 * Native has no such element, so the trigger keeps the web's field shape and the
 * options open in our Sheet — the same treatment every other momentary panel in
 * the app gets, rather than a second dropdown idiom.
 *
 * The list is a ScrollView, not a FlatList: a select's options are a bounded set
 * a caller writes by hand. Anything unbounded (jobs, answers) is a FlatList.
 */
export function Select<T extends string>({
  value,
  onValueChange,
  options,
  placeholder = 'Select…',
  disabled = false,
  'aria-label': ariaLabel,
  className,
}: SelectProps<T>) {
  const [open, setOpen] = useState(false);
  const { colors = LIGHT_COLORS } = useTheme() ?? {};
  const selected = options.find((option) => option.value === value);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={ariaLabel}
        accessibilityState={{ disabled, expanded: open }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={{
          backgroundColor: colors.background,
          borderColor: colors.input,
        }}
        className={cn(
          'h-11 w-full flex-row items-center justify-between rounded-lg border border-input bg-background pl-3.5 pr-3',
          disabled && 'opacity-50',
          className
        )}>
        <Text
          style={{ color: selected ? colors.foreground : colors.mutedForeground }}
          className={cn('text-sm', selected ? 'text-foreground' : 'text-muted-foreground')}>
          {selected?.label ?? placeholder}
        </Text>
        <Icon
          icon={ChevronDown}
          size={16}
          strokeWidth={1.75}
          color={colors.mutedForeground}
          className="text-muted-foreground"
        />
      </Pressable>

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent hideClose>
          {ariaLabel ? <SheetTitle className="mb-2">{ariaLabel}</SheetTitle> : null}
          <ScrollView style={{ flexGrow: 0 }} bounces={false} showsVerticalScrollIndicator={false}>
            {options.map((option) => {
              const active = option.value === value;
              return (
                <Pressable
                  key={option.value}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  onPress={() => {
                    setOpen(false);
                    onValueChange(option.value);
                  }}
                  className="h-12 flex-row items-center justify-between rounded-md px-2 active:opacity-70">
                  <Text
                    style={{ color: active ? colors.primary : colors.foreground }}
                    className={cn(
                      'text-sm',
                      active ? 'font-sans-medium text-primary' : 'text-foreground'
                    )}>
                    {option.label}
                  </Text>
                  {active ? (
                    <Icon
                      icon={Check}
                      size={16}
                      strokeWidth={2}
                      color={colors.primary}
                      className="text-primary"
                    />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </SheetContent>
      </Sheet>
    </>
  );
}
