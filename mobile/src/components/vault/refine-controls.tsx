import { useState } from 'react';
import { Sparkles, Wand2 } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native-css/components';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LIGHT_COLORS, useTheme } from '@/hooks/use-theme';
import type { RefineAction } from '@/types/cover-letter';

const PRESETS: readonly { label: string; action: RefineAction }[] = [
  { label: 'Humanize', action: 'humanize' },
  { label: 'Shorten', action: 'shorten' },
  { label: 'Make longer', action: 'lengthen' },
  { label: 'Fix grammar', action: 'fix-grammar' },
];

export interface RefineControlsProps {
  busy: boolean;
  onRun: (action: RefineAction, instructions?: string) => void;
}

/**
 * The "Improve with AI" trigger panel for mobile — lets the user fire preset
 * refine actions (humanize, shorten, lengthen, fix-grammar) or provide custom
 * prompt instructions.
 */
export function RefineControls({ busy, onRun }: RefineControlsProps) {
  const { colors = LIGHT_COLORS } = useTheme() ?? {};
  const [instructions, setInstructions] = useState('');
  const trimmed = instructions.trim();

  return (
    <View
      className="gap-3 rounded-lg border p-3.5"
      style={{ backgroundColor: colors.card, borderColor: colors.border }}>
      <View className="flex-row items-center gap-1.5">
        <Icon icon={Sparkles} size={15} color={colors.primary} />
        <Text
          className="font-sans-medium text-xs"
          style={{ color: colors.foreground }}>
          Improve with AI
        </Text>
      </View>

      <View className="flex-row flex-wrap gap-1.5">
        {PRESETS.map((preset) => (
          <Pressable
            key={preset.action}
            accessibilityRole="button"
            accessibilityLabel={`Refine: ${preset.label}`}
            disabled={busy}
            onPress={() => onRun(preset.action, trimmed || undefined)}
            className="rounded-md border px-2.5 py-1.5 active:opacity-80"
            style={{
              backgroundColor: colors.background,
              borderColor: colors.input,
            }}>
            <Text
              className="text-xs font-sans-medium"
              style={{ color: colors.foreground }}>
              {preset.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View className="flex-row items-center gap-2">
        <View className="flex-1">
          <Input
            value={instructions}
            onChangeText={setInstructions}
            placeholder="Tell AI what to change…"
            accessibilityLabel="Custom AI instructions"
            editable={!busy}
            className="h-9 text-xs"
          />
        </View>
        <Button
          size="sm"
          disabled={busy || !trimmed}
          accessibilityLabel="Run custom instruction"
          onPress={() => {
            if (trimmed) onRun('custom', trimmed);
          }}
          className="h-9 px-3">
          <Icon icon={Wand2} size={14} color={colors.primaryForeground} />
          <Text
            className="text-xs font-sans-medium"
            style={{ color: colors.primaryForeground }}>
            {busy ? 'Improving…' : 'Refine'}
          </Text>
        </Button>
      </View>
    </View>
  );
}
