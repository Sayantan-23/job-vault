import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native-css/components';

import { GhostMeter } from './ghost-meter';
import { OutreachBadge } from './outreach-badge';
import { StatusChip } from './status-chip';
import { RouteProgress } from '@/components/ui/route-progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useKanban } from '@/hooks/use-kanban';
import { STATUS_META, type JobStatus } from '@/lib/job-status';
import type { KanbanCard, KanbanColumn } from '@/types/kanban';
import { SCREEN_BOTTOM_INSET } from '@/theme';

const COLUMN_WIDTH = 290;

function KanbanCardItem({ card }: { card: KanbanCard }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${card.title} at ${card.company}`}
      onPress={() =>
        router.push({ pathname: '/jobs/[id]', params: { id: card.id } })
      }
      className="mb-3 rounded-xl border border-hairline bg-card p-3.5 shadow-sm active:opacity-70">
      <Text className="font-sans-medium text-[15px] text-foreground" numberOfLines={2}>
        {card.title}
      </Text>
      <Text className="mt-0.5 text-[13px] text-muted-foreground" numberOfLines={1}>
        {card.company}
        {card.location ? ` · ${card.location}` : ''}
      </Text>

      <View className="mt-3 flex-row items-center justify-between">
        <View className="flex-row items-center gap-2">
          <OutreachBadge
            variant="list"
            count={card.outreachCount ?? 0}
            replies={card.outreachReplies ?? 0}
          />
          <GhostMeter days={card.ghostDays} />
        </View>
        <StatusChip status={card.status} />
      </View>
    </Pressable>
  );
}

function KanbanColumnView({ column }: { column: KanbanColumn }) {
  const meta = STATUS_META[column.status as JobStatus] ?? {
    label: column.status,
  };

  return (
    <View
      style={{ width: COLUMN_WIDTH }}
      className="mr-4 flex-1 rounded-2xl border border-hairline bg-muted/30 p-3">
      {/* Column Header */}
      <View className="mb-3 flex-row items-center justify-between px-1">
        <View className="flex-row items-center gap-2">
          <Text className="font-sans-medium text-sm text-foreground">
            {meta.label}
          </Text>
          <View className="rounded-full bg-card px-2 py-0.5 border border-hairline">
            <Text className="font-mono text-[11px] text-muted-foreground">
              {column.jobs.length}
            </Text>
          </View>
        </View>
      </View>

      {/* Cards List */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        className="flex-1"
        contentContainerStyle={{ paddingBottom: SCREEN_BOTTOM_INSET }}>
        {column.jobs.length > 0 ? (
          column.jobs.map((card) => (
            <KanbanCardItem key={card.id} card={card} />
          ))
        ) : (
          <View className="items-center justify-center rounded-xl border border-dashed border-hairline/80 py-10">
            <Text className="text-xs text-muted-foreground">No jobs in stage</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

function KanbanSkeleton() {
  return (
    <View className="flex-1 flex-row px-4 py-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <View
          key={i}
          style={{ width: COLUMN_WIDTH }}
          className="mr-4 flex-1 rounded-2xl border border-hairline bg-muted/20 p-3">
          <Skeleton className="mb-4 h-6 w-1/3" />
          <Skeleton className="mb-3 h-24 w-full rounded-xl" />
          <Skeleton className="mb-3 h-24 w-full rounded-xl" />
        </View>
      ))}
    </View>
  );
}

export function KanbanBoard({
  filters,
}: {
  filters?: { search?: string; ghost?: string };
}) {
  const { data, isLoading } = useKanban(filters);

  if (isLoading || !data) {
    return (
      <View className="flex-1">
        <RouteProgress />
        <KanbanSkeleton />
      </View>
    );
  }

  // Filter out ARCHIVED from the default board columns if empty, but preserve active pipeline columns
  const visibleColumns = data.columns.filter(
    (col) => col.status !== 'ARCHIVED' || col.jobs.length > 0
  );

  return (
    <View className="flex-1 pt-2">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16 }}>
        {visibleColumns.map((col) => (
          <KanbanColumnView key={col.status} column={col} />
        ))}
      </ScrollView>
    </View>
  );
}
