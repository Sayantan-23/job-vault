import { Mail } from 'lucide-react-native';
import { Text, View } from 'react-native-css/components';

import { Icon } from '@/components/icon';
import { cn } from '@/components/ui/cn';

// Ported from frontend-next/src/components/jobs/outreach-badge.tsx. The web's
// `hidden sm:flex` on the list variant is dropped — mobile is always narrow,
// so the badge always renders when there is outreach to show. RN does not
// inherit colour into an SVG; the muted tone is applied to the Icon via the
// `Icon` wrapper and to the Text directly.
export function OutreachBadge({
  variant = 'list',
  count = 0,
  replies = 0,
}: {
  variant?: 'list' | 'card';
  count?: number;
  replies?: number;
}) {
  if (count <= 0) return null;

  if (variant === 'list') {
    return (
      <View
        accessibilityLabel={`${count} contacted${replies > 0 ? ` · ${replies} replied` : ''}`}
        className="flex-row items-center gap-1">
        <Icon icon={Mail} size={14} strokeWidth={2} className="text-muted-foreground" />
        <Text className="font-mono text-xs text-muted-foreground">{count}</Text>
        {replies > 0 ? (
          <Text className="font-mono text-xs text-muted-foreground">{`· ${replies} replied`}</Text>
        ) : null}
      </View>
    );
  }

  const tone = replies > 0 ? 'text-primary' : 'text-muted-foreground';
  return (
    <View
      accessibilityLabel={`${count} contacted · ${replies} replied`}
      className="flex-row items-center gap-1">
      <Icon icon={Mail} size={12} strokeWidth={2} className={tone} />
      <Text className={cn('font-mono text-[11px]', tone)}>{count}</Text>
    </View>
  );
}
