import { useRef } from 'react';
import { router } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import { Pressable, Text, View } from 'react-native-css/components';

import { GhostMeter } from './ghost-meter';
import { OutreachBadge } from './outreach-badge';
import { StatusChip } from './status-chip';
import { useUpdateJob } from '@/hooks/use-jobs';
import { JOB_STATUSES } from '@/lib/job-status';
import type { Job } from '@/types/job';

// ponytail: swipe reveals one action (advance status), not the full status
// picker — add per-status buttons if the single-action feels limiting.

// Inline rather than a new lib file — the timeline lane can extract a shared
// `shortDate` when it has a second caller; one consumer is YAGNI.
function shortDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function nextStatus(status: Job['status']): Job['status'] | null {
  const idx = JOB_STATUSES.indexOf(status);
  if (idx < 0 || idx >= JOB_STATUSES.length - 1) return null;
  return JOB_STATUSES[idx + 1];
}

export function JobRow({ job }: { job: Job }) {
  const swipeRef = useRef<Swipeable>(null);
  const advance = useUpdateJob(job.id);
  const next = nextStatus(job.status);

  const handleAdvance = () => {
    if (!next) return;
    advance.mutate({ status: next });
    swipeRef.current?.close();
  };

  return (
    <Swipeable
      ref={swipeRef}
      renderRightActions={
        next
          ? () => (
              <Pressable
                accessibilityLabel={`Advance to ${next}`}
                onPress={handleAdvance}
                className="flex-row items-center bg-primary px-6 active:opacity-90">
                <Text className="font-sans-medium text-sm text-primary-foreground">
                  {next.toLowerCase()}
                </Text>
              </Pressable>
            )
          : undefined
      }
      overshootRight={false}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${job.title} at ${job.company}`}
        onPress={() => router.push({ pathname: '/jobs/[id]', params: { id: job.id } })}
        className="flex-row items-center justify-between gap-3 px-5 py-3 active:opacity-70">
        <View className="min-w-0 flex-1">
          <Text className="text-[15px] text-foreground" numberOfLines={1}>
            {job.title}
          </Text>
          <Text className="text-[13px] text-muted-foreground" numberOfLines={1}>
            {job.company}
            {job.location ? ` · ${job.location}` : ''}
          </Text>
        </View>
        <View className="flex-row items-center gap-3">
          <OutreachBadge variant="list" count={job.outreachCount ?? 0} replies={job.outreachReplies ?? 0} />
          <StatusChip status={job.status} />
          <GhostMeter days={job.ghostDays} />
          <Text className="font-mono text-xs text-muted-foreground">
            {shortDate(job.createdAt)}
          </Text>
        </View>
      </Pressable>
    </Swipeable>
  );
}
