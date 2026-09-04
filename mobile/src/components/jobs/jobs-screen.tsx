import { useEffect, useMemo, useState } from 'react';
import Animated from 'react-native-reanimated';
import { SlidersHorizontal } from 'lucide-react-native';
import { Text, View } from 'react-native-css/components';

import { AppHeader } from '@/components/app-header';
import { Fab } from '@/components/fab';
import { FilterSheet } from '@/components/jobs/filter-sheet';
import { JobRow } from '@/components/jobs/job-row';
import { IconButton } from '@/components/ui/icon-button';
import { EmptyState } from '@/components/ui/empty-state';
import { RouteProgress } from '@/components/ui/route-progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { useHideOnScroll } from '@/hooks/use-hide-on-scroll';
import { useInfiniteJobs } from '@/hooks/use-jobs';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { ghostLevel } from '@/lib/ghost';
import { isListFiltered } from '@/lib/filters';
import { DEFAULT_FILTERS } from '@/types/filters';
import { JOBS_KEY } from '@/lib/query-keys';
import { useQueryClient } from '@tanstack/react-query';
import { SCREEN_BOTTOM_INSET } from '@/theme';
import type { Job } from '@/types/job';
import type { JobFilters as Filters } from '@/types/filters';

// Two-bucket client-side partition mirroring the web (job-list.tsx): jobs still
// in the live pipeline (APPLIED/INTERVIEWING) that have gone stale/ghosted are
// surfaced first as "Needs your attention"; everything else is "In progress".
// Server order is preserved inside each bucket — re-sorting would make the Sort
// menu lie.
type Group = { label: string | null; jobs: Job[] };

function needsAttention(job: Job): boolean {
  return (
    ghostLevel(job.ghostDays) !== 'active' &&
    (job.status === 'APPLIED' || job.status === 'INTERVIEWING')
  );
}

function groupJobs(jobs: Job[]): Group[] {
  const needs = jobs.filter(needsAttention);
  const inProgress = jobs.filter((j) => !needsAttention(j));
  const groups: Group[] = [];
  if (needs.length) groups.push({ label: 'Needs your attention', jobs: needs });
  if (inProgress.length) {
    groups.push({ label: needs.length ? 'In progress' : null, jobs: inProgress });
  }
  return groups;
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <View className="flex-row items-center gap-2 px-5 pb-1 pt-4">
      <Text className="font-sans-medium text-sm text-muted-foreground">{label}</Text>
      <Text className="font-mono text-[11px] text-muted-foreground/80">{count}</Text>
    </View>
  );
}

function ListSkeleton() {
  return (
    <View className="px-5">
      {Array.from({ length: 8 }).map((_, i) => (
        // Bi-directional keys are stable across renders; index is fine for a
        // placeholder that never reorders.
        <View key={i} className="h-12 border-b border-hairline py-3">
          <Skeleton className="h-4 w-1/2" />
        </View>
      ))}
    </View>
  );
}

function ListEmpty({
  filtered,
  onReset,
}: {
  filtered: boolean;
  onReset: () => void;
}) {
  return (
    <EmptyState
      title={filtered ? 'No jobs match your filters' : 'No jobs yet'}
      description={
        filtered
          ? 'Try widening or clearing them.'
          : 'Add your first application to start tracking it.'
      }
      action={
        filtered ? (
          <Button variant="outline" size="sm" onPress={onReset}>
            Reset filters
          </Button>
        ) : null
      }
    />
  );
}

export function JobsScreen() {
  const [filters, setFilters] = useState<Filters>({ ...DEFAULT_FILTERS });
  const [filterOpen, setFilterOpen] = useState(false);
  const { hidden, onScroll } = useHideOnScroll();
  const qc = useQueryClient();

  const query = useInfiniteJobs(filters);
  const rows = useMemo(() => query.data ?? [], [query.data]);
  const groups = useMemo(() => groupJobs(rows), [rows]);

  // ponytail: blunt invalidation on any job event — scope to the changed id if
  // chatter bites.
  useEffect(() => {
    const socket = connectSocket();
    const handler = () => {
      void qc.invalidateQueries({ queryKey: JOBS_KEY });
    };
    socket.on('job:created', handler);
    socket.on('job:updated', handler);
    socket.on('job:deleted', handler);
    return () => {
      socket.off('job:created', handler);
      socket.off('job:updated', handler);
      socket.off('job:deleted', handler);
      disconnectSocket();
    };
  }, [qc]);

  const onEndReached = () => {
    if (query.hasNextPage && !query.isFetchingNextPage) {
      void query.fetchNextPage();
    }
  };

  const resetFilters = () => setFilters({ ...DEFAULT_FILTERS });

  // Flatten groups into a section-header + rows list for FlatList. Server order
  // preserved inside each group.
  const sections = useMemo(() => {
    const items: (
      | { kind: 'header'; label: string; count: number }
      | { kind: 'row'; job: Job }
    )[] = [];
    for (const g of groups) {
      if (g.label) {
        items.push({ kind: 'header', label: g.label, count: g.jobs.length });
      }
      for (const job of g.jobs) items.push({ kind: 'row', job });
    }
    return items;
  }, [groups]);

  const showSkeleton = query.isLoading && rows.length === 0;
  const showEmpty = !query.isLoading && rows.length === 0;
  const filtered = isListFiltered(filters);

  return (
    <View className="flex-1 bg-tab-bar">
      <View className="flex-1 overflow-hidden rounded-b-[20px] bg-background">
        <AppHeader
          title="Jobs"
          action={
            <IconButton
              icon={SlidersHorizontal}
              accessibilityLabel="Filter jobs"
              onPress={() => setFilterOpen(true)}
            />
          }
        />
        {query.isLoading && rows.length === 0 ? <RouteProgress /> : null}
        <Animated.FlatList
          onScroll={onScroll}
          scrollEventThrottle={16}
          data={sections}
          keyExtractor={(item, i) =>
            item.kind === 'row' ? `job-${item.job.id}` : `head-${i}`
          }
          renderItem={({ item }) =>
            item.kind === 'header' ? (
              <SectionHeader label={item.label} count={item.count} />
            ) : (
              <JobRow job={item.job} />
            )
          }
          onEndReached={onEndReached}
          onEndReachedThreshold={0.4}
          ListFooterComponent={
            query.isFetchingNextPage ? <RouteProgress /> : null
          }
          ListEmptyComponent={
            showSkeleton ? null : showEmpty ? (
              <ListEmpty filtered={filtered} onReset={resetFilters} />
            ) : null
          }
          ListHeaderComponent={showSkeleton ? <ListSkeleton /> : null}
          contentContainerStyle={{ paddingBottom: SCREEN_BOTTOM_INSET }}
        />
      </View>
      <Fab hidden={hidden} accessibilityLabel="Add job" />
      <FilterSheet
        open={filterOpen}
        onOpenChange={setFilterOpen}
        filters={filters}
        onFiltersChange={setFilters}
      />
    </View>
  );
}
