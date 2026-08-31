import { Check } from 'lucide-react-native';
import { Pressable } from 'react-native-css/components';

import { Icon } from '@/components/icon';

import { cn } from './cn';

export type CheckboxProps = {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  disabled?: boolean;
  'aria-label'?: string;
  className?: string;
};

/**
 * Keeps the web's 16px box so a form reads the same on both clients, and buys
 * the touch target back with hitSlop rather than by growing the glyph.
 */
export function Checkbox({
  checked = false,
  onCheckedChange,
  disabled = false,
  'aria-label': ariaLabel,
  className,
}: CheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel={ariaLabel}
      accessibilityState={{ checked, disabled }}
      disabled={disabled}
      hitSlop={12}
      onPress={() => onCheckedChange?.(!checked)}
      className={cn(
        'size-4 shrink-0 items-center justify-center rounded border border-input',
        checked ? 'border-primary bg-primary' : 'bg-background',
        disabled && 'opacity-50',
        className
      )}>
      {checked ? (
        <Icon icon={Check} size={12} strokeWidth={3} className="text-primary-foreground" />
      ) : null}
    </Pressable>
  );
}
