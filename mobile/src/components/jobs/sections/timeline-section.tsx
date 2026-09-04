import { Text, View } from 'react-native-css/components';

import { useJobTimeline } from '@/hooks/use-timeline';
import { shortDate } from '@/lib/relative-time';

// Read-only feed — no add/edit/delete in C3.
// ponytail: read-only — CRUD is a later slice.
export function TimelineSection({ jobId }: { jobId: string }) {
  const { data: events = [], isLoading } = useJobTimeline(jobId);

  return (
    <View className="gap-3">
      <Text className="font-sans-medium text-sm text-foreground">Timeline</Text>
      {isLoading ? (
        <Text className="text-sm text-muted-foreground">Loading…</Text>
      ) : events.length === 0 ? (
        <Text className="text-sm text-muted-foreground">No activity yet.</Text>
      ) : (
        <View className="gap-2">
          {events.map((e) => (
            <View key={e.id} className="flex-row items-start justify-between gap-2">
              <View className="min-w-0 flex-1">
                <Text className="text-sm text-foreground">{e.title}</Text>
                {e.description ? (
                  <Text className="mt-0.5 text-xs text-muted-foreground">
                    {e.description}
                  </Text>
                ) : null}
              </View>
              <Text className="font-mono text-xs text-muted-foreground">
                {shortDate(e.createdAt)}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}
