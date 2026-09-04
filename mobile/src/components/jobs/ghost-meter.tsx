import { Clock, Ghost, Timer } from 'lucide-react-native';
import { Text, View } from 'react-native-css/components';

import { Icon } from '@/components/icon';
import { cn } from '@/components/ui/cn';
import { ghostLevel, ghostLabel, type GhostLevel } from '@/lib/ghost';

const LEVEL_GLYPH = {
  active: Clock,
  stale: Timer,
  ghosted: Ghost,
} as const satisfies Record<GhostLevel, typeof Clock>;

const LEVEL_TONE: Record<GhostLevel, string> = {
  active: 'text-ghost-active',
  stale: 'text-ghost-stale',
  ghosted: 'text-ghost-ghosted',
};

// Ported from frontend-next/src/components/kanban/ghost-meter.tsx. RN does not
// inherit colour into an SVG, so the tone class is applied to the Icon via the
// `Icon` wrapper (stroke = color) rather than to a wrapping span.
export function GhostMeter({ days }: { days: number }) {
  const level = ghostLevel(days);
  const tone = LEVEL_TONE[level];
  return (
    <View accessibilityLabel={ghostLabel(days)} className="flex-row items-center gap-1">
      <Icon icon={LEVEL_GLYPH[level]} size={14} strokeWidth={2} className={tone} />
      <Text className={cn('font-mono text-xs', tone)}>{days}d</Text>
    </View>
  );
}
