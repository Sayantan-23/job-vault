import { useRouter } from 'expo-router';
import { Bot, PencilLine, type LucideIcon } from 'lucide-react-native';
import { Pressable, Text, View } from 'react-native-css/components';

import { Icon } from '@/components/icon';
import { useTheme } from '@/hooks/use-theme';
import { relativeTime } from '@/lib/relative-time';
import type { GlobalTimelineEvent } from '@/types/timeline';

export interface TimelineRowProps {
  event: GlobalTimelineEvent;
  isLast: boolean;
  onJobPress?: (jobId: string) => void;
}

export function TimelineRow({ event, isLast, onJobPress }: TimelineRowProps) {
  const router = useRouter();
  const { colors } = useTheme();
  const isManual = event.type === 'MANUAL';
  const IconComponent: LucideIcon = isManual ? PencilLine : Bot;

  const handleJobPress = () => {
    if (onJobPress) {
      onJobPress(event.jobId);
    } else {
      router.push({
        pathname: '/jobs/[id]',
        params: { id: event.jobId },
      });
    }
  };

  return (
    <View testID="timeline-entry" className="relative flex-row gap-3 px-4">
      {/* Connected rail */}
      <View className="relative w-7 items-center">
        {!isLast ? (
          <View
            pointerEvents="none"
            style={{ backgroundColor: colors.border }}
            className="absolute bottom-0 top-7 w-[1.5px] bg-border"
          />
        ) : null}
        <View
          style={{
            backgroundColor: colors.background,
            borderColor: isManual ? colors.primary : colors.border,
          }}
          className={`size-7 items-center justify-center rounded-full border bg-background ${
            isManual ? 'border-primary/40' : 'border-border'
          }`}>
          <Icon
            icon={IconComponent}
            size={13}
            className={isManual ? 'text-primary' : 'text-muted-foreground'}
          />
        </View>
      </View>

      {/* Content */}
      <View className="min-w-0 flex-1 pb-5">
        <View className="flex-row items-baseline justify-between gap-2">
          <Text
            style={{ color: colors.foreground }}
            className="min-w-0 flex-1 font-sans-medium text-sm leading-snug text-foreground">
            {event.title}
          </Text>
          <Text
            style={{ color: colors.mutedForeground }}
            className="font-mono text-xs tabular-nums text-muted-foreground">
            {relativeTime(event.createdAt)}
          </Text>
        </View>
        {event.description ? (
          <Text
            style={{ color: colors.mutedForeground }}
            className="mt-1 text-sm leading-snug text-muted-foreground">
            {event.description}
          </Text>
        ) : null}
        <Pressable
          accessibilityRole="link"
          accessibilityLabel={`View job ${event.jobTitle} at ${event.jobCompany}`}
          onPress={handleJobPress}
          style={{ backgroundColor: colors.secondary, borderColor: colors.border }}
          className="mt-2 self-start flex-row items-center gap-1 rounded border border-border/80 bg-muted/40 px-2 py-0.5 active:opacity-70">
          <Text
            style={{ color: colors.mutedForeground }}
            className="text-xs font-sans-medium text-muted-foreground"
            numberOfLines={1}>
            {event.jobCompany} — {event.jobTitle}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
