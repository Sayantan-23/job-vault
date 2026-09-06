import { useState } from 'react';
import { Sparkles, Wand2 } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native-css/components';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const [instructions, setInstructions] = useState('');
  const trimmed = instructions.trim();

  return (
    <View className="gap-3 rounded-lg border border-border bg-card p-3.5">
      <View className="flex-row items-center gap-1.5">
        <Icon icon={Sparkles} size={15} className="text-primary" />
        <Text className="font-sans-medium text-xs text-foreground">Improve with AI</Text>
      </View>

      <View className="flex-row flex-wrap gap-1.5">
        {PRESETS.map((preset) => (
          <Pressable
            key={preset.action}
            accessibilityRole="button"
            accessibilityLabel={`Refine: ${preset.label}`}
            disabled={busy}
            onPress={() => onRun(preset.action, trimmed || undefined)}
            className="rounded-md border border-input bg-background px-2.5 py-1.5 active:bg-muted active:opacity-80">
            <Text className="text-xs font-sans-medium text-foreground">{preset.label}</Text>
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
          <Icon icon={Wand2} size={14} className="text-primary-foreground" />
          <Text className="text-xs font-sans-medium text-primary-foreground">
            {busy ? 'Improving…' : 'Refine'}
          </Text>
        </Button>
      </View>
    </View>
  );
}
