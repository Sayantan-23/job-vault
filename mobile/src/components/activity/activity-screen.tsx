import { useMemo, useRef, useState } from 'react';
import { RefreshControl } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Bell, Briefcase, CheckCheck, Clock } from 'lucide-react-native';
import Animated from 'react-native-reanimated';
import { BlurTargetView } from 'expo-blur';
import { Pressable, Text, View } from 'react-native-css/components';

import { AppHeader } from '@/components/app-header';
import { Icon } from '@/components/icon';
import { BlurTargetProvider } from '@/components/ui/blur-target';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { RouteProgress } from '@/components/ui/route-progress';
import { SpeedDial, type SpeedDialAction } from '@/components/ui/speed-dial';
import { useGlobalTimeline } from '@/hooks/use-global-timeline';
import { useHideOnScroll } from '@/hooks/use-hide-on-scroll';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
} from '@/hooks/use-notifications';
import { apiClient } from '@/lib/api-client';
import { globalTimelineQuery } from '@/lib/queries';
import { useTheme } from '@/hooks/use-theme';
import { dayGroupLabel, dayKey } from '@/lib/relative-time';
import { darkVars, lightVars, SCREEN_BOTTOM_INSET } from '@/theme';
import type { Notification } from '@/types/notification';
import type { GlobalTimelineEvent } from '@/types/timeline';

import { NotificationRow } from './notification-row';
import { TimelineRow } from './timeline-row';

export type ActivityFilter = 'all' | 'timeline' | 'notifications';

export type FeedItem =
  | { kind: 'day_header'; key: string; label: string }
  | { kind: 'timeline'; key: string; event: GlobalTimelineEvent; isLastInGroup: boolean }
  | { kind: 'notification'; key: string; notification: Notification };

export interface ActivityScreenProps {
  initialFilter?: ActivityFilter;
}

export function ActivityScreen({ initialFilter }: ActivityScreenProps) {
  const { effectiveTheme, colors } = useTheme();
  const activeVars = effectiveTheme === 'dark' ? darkVars : lightVars;
  const barBg = colors.tabBar;
  const pageBg = colors.background;
  const router = useRouter();
  const params = useLocalSearchParams<{ filter?: string }>();

  const [prevParamFilter, setPrevParamFilter] = useState(params.filter);
  const [filter, setFilter] = useState<ActivityFilter>(() => {
    if (params.filter === 'timeline' || params.filter === 'notifications' || params.filter === 'all') {
      return params.filter;
    }
    return initialFilter ?? 'all';
  });

  if (params.filter !== prevParamFilter) {
    setPrevParamFilter(params.filter);
    if (params.filter === 'timeline' || params.filter === 'notifications' || params.filter === 'all') {
      setFilter(params.filter);
    }
  }

  const { hidden, onScroll } = useHideOnScroll();
  const blurTargetRef = useRef<any>(null);

  const {
    data: notifications = [],
    isLoading: isNotificationsLoading,
    refetch: refetchNotifications,
  } = useNotifications();
  const unreadCount = useUnreadNotificationCount();
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const [page, setPage] = useState(1);
  const [olderEvents, setOlderEvents] = useState<GlobalTimelineEvent[]>([]);
  const [loadingOlder, setLoadingOlder] = useState(false);

  const {
    data: timelineData,
    isLoading: isTimelineLoading,
    refetch: refetchTimeline,
  } = useGlobalTimeline(1);

  const timelineEvents = useMemo(() => {
    const base = timelineData?.data ?? [];
    if (olderEvents.length === 0) return base;
    const existingIds = new Set(base.map((e) => e.id));
    const uniqueOlder = olderEvents.filter((e) => !existingIds.has(e.id));
    return [...base, ...uniqueOlder];
  }, [timelineData?.data, olderEvents]);

  const [refreshing, setRefreshing] = useState(false);
  const handleRefresh = async () => {
    setRefreshing(true);
    setPage(1);
    setOlderEvents([]);
    await Promise.all([refetchNotifications(), refetchTimeline()]);
    setRefreshing(false);
  };

  const handleLoadOlder = async () => {
    const nextPage = page + 1;
    setLoadingOlder(true);
    try {
      const nextPageData = await apiClient.getPage<GlobalTimelineEvent>(
        globalTimelineQuery(nextPage).path
      );
      setPage(nextPage);
      if (nextPageData?.data) {
        setOlderEvents((prev) => {
          const existingIds = new Set(prev.map((e) => e.id));
          const fresh = nextPageData.data.filter((e) => !existingIds.has(e.id));
          return [...prev, ...fresh];
        });
      }
    } finally {
      setLoadingOlder(false);
    }
  };

  const handleNotificationSelect = (notification: Notification) => {
    if (!notification.isRead) {
      markRead.mutate(notification.id);
    }
    if (notification.relatedJobId) {
      router.push({
        pathname: '/jobs/[id]',
        params: { id: notification.relatedJobId },
      });
    }
  };

  const feedItems = useMemo<FeedItem[]>(() => {
    type RawItem =
      | { type: 'timeline'; event: GlobalTimelineEvent; createdAt: string }
      | { type: 'notification'; notification: Notification; createdAt: string };

    const raw: RawItem[] = [];

    if (filter === 'all' || filter === 'timeline') {
      raw.push(
        ...timelineEvents.map((event) => ({
          type: 'timeline' as const,
          event,
          createdAt: event.createdAt,
        }))
      );
    }

    if (filter === 'all' || filter === 'notifications') {
      raw.push(
        ...notifications.map((notification) => ({
          type: 'notification' as const,
          notification,
          createdAt: notification.createdAt,
        }))
      );
    }

    raw.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const groups: { key: string; label: string; items: RawItem[] }[] = [];
    for (const item of raw) {
      const key = dayKey(item.createdAt);
      const last = groups[groups.length - 1];
      if (last && last.key === key) {
        last.items.push(item);
      } else {
        groups.push({
          key,
          label: dayGroupLabel(item.createdAt),
          items: [item],
        });
      }
    }

    const flattened: FeedItem[] = [];
    for (const group of groups) {
      flattened.push({
        kind: 'day_header',
        key: `header-${group.key}`,
        label: group.label,
      });

      const items = group.items;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const isLastInGroup = i === items.length - 1;
        if (item.type === 'timeline') {
          flattened.push({
            kind: 'timeline',
            key: `tl-${item.event.id}`,
            event: item.event,
            isLastInGroup,
          });
        } else {
          flattened.push({
            kind: 'notification',
            key: `notif-${item.notification.id}`,
            notification: item.notification,
          });
        }
      }
    }

    return flattened;
  }, [filter, timelineEvents, notifications]);

  const isLoading =
    (filter === 'timeline' && isTimelineLoading) ||
    (filter === 'notifications' && isNotificationsLoading) ||
    (filter === 'all' && isTimelineLoading && isNotificationsLoading);

  const dialActions: SpeedDialAction[] = useMemo(() => {
    const actions: SpeedDialAction[] = [];
    if (unreadCount > 0) {
      actions.push({
        key: 'mark-all-read',
        label: 'Mark all as read',
        icon: CheckCheck,
        accessibilityLabel: 'Mark all notifications as read',
        onPress: () => markAllRead.mutate(),
      });
    }
    actions.push({
      key: 'jobs',
      label: 'View jobs',
      icon: Briefcase,
      accessibilityLabel: 'View jobs',
      onPress: () => router.navigate('/(tabs)'),
    });
    return actions;
  }, [unreadCount, markAllRead, router]);

  const renderEmptyState = () => {
    if (isLoading) return null;
    if (filter === 'notifications') {
      return (
        <EmptyState
          title="You're all caught up"
          description="No new alerts or reminders right now."
        />
      );
    }
    if (filter === 'timeline') {
      return (
        <EmptyState
          title="No timeline activity yet"
          description="Add a job and your applications’ timeline events will show up here."
          action={
            <Button variant="default" size="sm" onPress={() => router.navigate('/(tabs)')}>
              Go to Jobs →
            </Button>
          }
        />
      );
    }
    return (
      <EmptyState
        title="No activity yet"
        description="Your applications’ timeline events and notifications will show up here."
        action={
          <Button variant="default" size="sm" onPress={() => router.navigate('/(tabs)')}>
            Go to Jobs →
          </Button>
        }
      />
    );
  };

  const hasMoreTimeline = Boolean(
    timelineData?.meta && page < timelineData.meta.totalPages
  );

  const renderFooter = () => {
    if (!hasMoreTimeline || filter === 'notifications') return null;
    return (
      <View className="items-center py-6">
        <Button
          variant="outline"
          size="sm"
          accessibilityLabel="Load older activity"
          disabled={loadingOlder || isTimelineLoading}
          onPress={handleLoadOlder}>
          {loadingOlder ? 'Loading...' : 'Load older activity'}
        </Button>
      </View>
    );
  };

  return (
    <BlurTargetProvider blurTarget={blurTargetRef}>
      <View
        key={effectiveTheme}
        style={[activeVars, { backgroundColor: barBg }]}
        className="flex-1 bg-tab-bar">
        <BlurTargetView ref={blurTargetRef} style={{ flex: 1 }}>
          <View
            style={{ backgroundColor: pageBg }}
            className="flex-1 overflow-hidden rounded-b-[20px] bg-background">
            <AppHeader title="Activity" />

            {/* Filter Pills */}
            <View className="flex-row items-center gap-2 px-4 pb-3 pt-1">
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Filter all activity"
                accessibilityState={{ selected: filter === 'all' }}
                onPress={() => setFilter('all')}
                style={filter === 'all' ? { backgroundColor: colors.primary } : { backgroundColor: colors.secondary, borderColor: colors.border }}
                className={`rounded-full px-3.5 py-1.5 active:opacity-80 ${
                  filter === 'all' ? 'bg-primary' : 'border border-border/80 bg-muted/60'
                }`}>
                <Text
                  style={filter === 'all' ? { color: colors.primaryForeground } : { color: colors.mutedForeground }}
                  className={`text-xs font-sans-medium ${
                    filter === 'all' ? 'text-primary-foreground' : 'text-muted-foreground'
                  }`}>
                  All
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Filter timeline"
                accessibilityState={{ selected: filter === 'timeline' }}
                onPress={() => setFilter('timeline')}
                style={filter === 'timeline' ? { backgroundColor: colors.primary } : { backgroundColor: colors.secondary, borderColor: colors.border }}
                className={`flex-row items-center gap-1.5 rounded-full px-3.5 py-1.5 active:opacity-80 ${
                  filter === 'timeline' ? 'bg-primary' : 'border border-border/80 bg-muted/60'
                }`}>
                <Icon
                  icon={Clock}
                  size={12}
                  className={
                    filter === 'timeline' ? 'text-primary-foreground' : 'text-muted-foreground'
                  }
                />
                <Text
                  style={filter === 'timeline' ? { color: colors.primaryForeground } : { color: colors.mutedForeground }}
                  className={`text-xs font-sans-medium ${
                    filter === 'timeline' ? 'text-primary-foreground' : 'text-muted-foreground'
                  }`}>
                  Timeline
                </Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Filter notifications"
                accessibilityState={{ selected: filter === 'notifications' }}
                onPress={() => setFilter('notifications')}
                style={filter === 'notifications' ? { backgroundColor: colors.primary } : { backgroundColor: colors.secondary, borderColor: colors.border }}
                className={`flex-row items-center gap-1.5 rounded-full px-3.5 py-1.5 active:opacity-80 ${
                  filter === 'notifications' ? 'bg-primary' : 'border border-border/80 bg-muted/60'
                }`}>
                <Icon
                  icon={Bell}
                  size={12}
                  className={
                    filter === 'notifications' ? 'text-primary-foreground' : 'text-muted-foreground'
                  }
                />
                <Text
                  style={filter === 'notifications' ? { color: colors.primaryForeground } : { color: colors.mutedForeground }}
                  className={`text-xs font-sans-medium ${
                    filter === 'notifications' ? 'text-primary-foreground' : 'text-muted-foreground'
                  }`}>
                  Notifications{unreadCount > 0 ? ` (${unreadCount})` : ''}
                </Text>
              </Pressable>
            </View>

            {/* Unread banner when on notifications or all and unread exist */}
            {unreadCount > 0 && (filter === 'notifications' || filter === 'all') ? (
              <View className="mx-4 mb-2 flex-row items-center justify-between rounded-lg border border-border/80 bg-muted/30 px-3.5 py-2">
                <View className="min-w-0 flex-1 flex-row items-center gap-2">
                  <View className="size-2 rounded-full bg-ghost-ghosted" />
                  <Text className="text-xs text-muted-foreground">
                    {unreadCount} unread {unreadCount === 1 ? 'notification' : 'notifications'}
                  </Text>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Mark all notifications as read"
                  onPress={() => markAllRead.mutate()}
                  className="flex-row items-center gap-1 active:opacity-70">
                  <Text className="text-xs font-sans-medium text-primary">Mark all read</Text>
                  <Icon icon={CheckCheck} size={13} className="text-primary" />
                </Pressable>
              </View>
            ) : null}

            {isLoading ? <RouteProgress /> : null}

            <Animated.FlatList
              data={feedItems}
              keyExtractor={(item) => item.key}
              onScroll={onScroll}
              scrollEventThrottle={16}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor="#576cb7"
                />
              }
              contentContainerStyle={{
                paddingBottom: SCREEN_BOTTOM_INSET,
                flexGrow: feedItems.length === 0 ? 1 : undefined,
              }}
              renderItem={({ item }) => {
                if (item.kind === 'day_header') {
                  return (
                    <View className="flex-row items-center gap-3 px-4 pb-2 pt-4">
                      <Text
                        style={{ color: colors.mutedForeground }}
                        className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
                        {item.label}
                      </Text>
                      <View
                        style={{ backgroundColor: colors.border }}
                        className="h-px flex-1 bg-border/80"
                      />
                    </View>
                  );
                }
                if (item.kind === 'timeline') {
                  return (
                    <TimelineRow
                      event={item.event}
                      isLast={item.isLastInGroup}
                    />
                  );
                }
                return (
                  <NotificationRow
                    notification={item.notification}
                    onSelect={handleNotificationSelect}
                  />
                );
              }}
              ListEmptyComponent={renderEmptyState}
              ListFooterComponent={renderFooter}
            />
          </View>
        </BlurTargetView>

        <SpeedDial actions={dialActions} hidden={hidden} />
      </View>
    </BlurTargetProvider>
  );
}
