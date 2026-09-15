import type { LucideIcon } from 'lucide-react-native';
import { Pressable } from 'react-native-css/components';

import { Icon } from '@/components/icon';
import { useTheme } from '@/hooks/use-theme';
import { LIGHT_COLORS } from '@/theme';

import { cn } from './cn';

export type IconButtonProps = {
  /**
   * The web takes an icon element as `children` and tints it by inheritance.
   * React Native has no colour inheritance into an SVG, so the glyph is a prop
   * and the control owns its tint.
   */
  icon: LucideIcon;
  accessibilityLabel: string;
  onPress?: () => void;
  disabled?: boolean;
  size?: number;
  className?: string;
  testID?: string;
};

/**
 * A quiet 36px circular icon control — the shape of the utility cluster in the
 * screen header (search, notifications). Not a Button variant: Button is a
 * labelled action with its own height scale, this is a bare glyph.
 */
export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  disabled = false,
  size = 20,
  className,
  testID,
}: IconButtonProps) {
  const { colors = LIGHT_COLORS } = useTheme() ?? {};
  return (
    <Pressable
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      className={cn(
        'size-9 items-center justify-center rounded-full active:opacity-70',
        disabled && 'opacity-50',
        className
      )}>
      <Icon
        icon={icon}
        size={size}
        strokeWidth={1.75}
        color={colors.mutedForeground}
        className="text-muted-foreground"
      />
    </Pressable>
  );
}
