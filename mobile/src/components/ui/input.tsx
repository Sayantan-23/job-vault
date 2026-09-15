import type { TextInputProps as RNTextInputProps } from 'react-native';
import { TextInput } from 'react-native-css/components';

import { useTheme } from '@/hooks/use-theme';
import { LIGHT_COLORS } from '@/theme';
import { cn } from './cn';

export type InputProps = RNTextInputProps & { className?: string };

/**
 * Single-line field. The web's focus ring has no native counterpart (there is no
 * focus-visible on a touch screen), so the border tightens on focus instead.
 */
export function Input({ className, editable = true, style, placeholderTextColor, ...props }: InputProps) {
  const { colors = LIGHT_COLORS } = useTheme() ?? {};
  return (
    <TextInput
      editable={editable}
      placeholderTextColor={placeholderTextColor ?? colors.mutedForeground}
      style={[
        {
          backgroundColor: colors.background,
          borderColor: colors.input,
          color: colors.foreground,
        },
        style,
      ]}
      className={cn(
        'h-11 w-full rounded-lg border border-input bg-background px-3.5 text-sm text-foreground',
        'placeholder:text-muted-foreground/60 focus:border-ring',
        !editable && 'opacity-50',
        className
      )}
      {...props}
    />
  );
}
