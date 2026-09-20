import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native-css/components';

import { GhostMeter } from './ghost-meter';
import { OutreachBadge } from './outreach-badge';
import { StatusChip } from './status-chip';
import { useTheme } from '@/hooks/use-theme';
import type { Job } from '@/types/job';

export function JobRow({ job }: { job: Job }) {
  const { colors } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${job.title} at ${job.company}`}
      onPress={() => router.push({ pathname: '/jobs/[id]', params: { id: job.id } })}
      className="flex-row items-center justify-between gap-3 px-5 py-3 active:opacity-70">
      <View className="min-w-0 flex-1 pr-1">
        <Text
          style={{ color: colors.foreground }}
          className="text-[15px] font-sans-medium text-foreground"
          numberOfLines={1}>
          {job.title}
        </Text>
        <Text
          style={{ color: colors.mutedForeground }}
          className="text-[13px] text-muted-foreground"
          numberOfLines={1}>
          {job.company}
          {job.location ? ` · ${job.location}` : ''}
        </Text>
      </View>
      <View className="flex-row items-center gap-2 shrink-0">
        <OutreachBadge variant="list" count={job.outreachCount ?? 0} replies={job.outreachReplies ?? 0} />
        <StatusChip status={job.status} />
        <GhostMeter days={job.ghostDays} />
      </View>
    </Pressable>
  );
}
