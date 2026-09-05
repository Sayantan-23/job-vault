import { useEffect, useRef, useState } from 'react';
import { Check, Copy } from 'lucide-react-native';
import { Pressable, Text } from 'react-native-css/components';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';

import { Icon } from '@/components/icon';
import { cn } from '@/components/ui/cn';

const LABEL = { short: 'S', long: 'L' } as const;

export interface AnswerCopyChipProps {
  variant: 'short' | 'long';
  text: string;
  question: string;
  onCopied: () => void;
  className?: string;
}

/**
 * One length variant's copy control:
 * Displays the variant letter + character count ("S 120", "L 1,450").
 * On press: copies to clipboard via expo-clipboard, provides haptic feedback,
 * flips to a transient "Copied" state, and fires onCopied (which marks answer used).
 */
export function AnswerCopyChip({
  variant,
  text,
  question,
  onCopied,
  className,
}: AnswerCopyChipProps) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const handleCopy = async () => {
    try {
      await Clipboard.setStringAsync(text);
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {
        // Haptics may be unavailable in some environments (e.g. simulator/tests)
      }
      setCopied(true);
      onCopied();
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write failed
    }
  };

  const formattedCount = text.length.toLocaleString();
  const labelText = copied ? 'Copied' : `${LABEL[variant]} ${formattedCount}`;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Copy the ${variant} answer to “${question}”`}
      onPress={handleCopy}
      className={cn(
        'h-7 flex-row items-center gap-1.5 rounded-md border border-input bg-background px-2 active:opacity-70',
        copied && 'border-primary/40 bg-primary/10',
        className
      )}>
      <Icon
        icon={copied ? Check : Copy}
        size={13}
        strokeWidth={1.75}
        className={copied ? 'text-primary' : 'text-muted-foreground'}
      />
      <Text
        className={cn(
          'font-mono text-xs tabular-nums',
          copied ? 'font-mono-medium text-primary' : 'text-foreground'
        )}>
        {labelText}
      </Text>
    </Pressable>
  );
}
