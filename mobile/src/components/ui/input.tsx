import type { TextInputProps as RNTextInputProps } from 'react-native';
import { TextInput } from 'react-native-css/components';

import { cn } from './cn';

export type InputProps = RNTextInputProps & { className?: string };

/**
 * Single-line field. The web's focus ring has no native counterpart (there is no
 * focus-visible on a touch screen), so the border tightens on focus instead.
 */
export function Input({ className, editable = true, ...props }: InputProps) {
  return (
    <TextInput
      editable={editable}
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
