import type { TextInputProps as RNTextInputProps } from 'react-native';
import { TextInput } from 'react-native-css/components';

import { cn } from './cn';

export type TextareaProps = RNTextInputProps & { className?: string };

/** Multi-line field. Android centres multiline text vertically unless told not to. */
export function Textarea({ className, editable = true, ...props }: TextareaProps) {
  return (
    <TextInput
      multiline
      textAlignVertical="top"
      editable={editable}
      className={cn(
        'min-h-20 w-full rounded-lg border border-input bg-background px-3.5 py-2.5 text-sm text-foreground',
        'placeholder:text-muted-foreground/60 focus:border-ring',
        !editable && 'opacity-50',
        className
      )}
      {...props}
    />
  );
}
