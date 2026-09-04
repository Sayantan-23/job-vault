import { Linking } from 'react-native';
import { Pressable, Text, View } from 'react-native-css/components';

import { useJobReminders } from '@/hooks/use-reminders';
import { shortDate } from '@/lib/relative-time';

const WEB_BASE = 'https://jobvault.app';

// Read-only reminder list — no reminder CRUD in C3.
// ponytail: read-only — CRUD is a later slice.
export function RemindersSection({ jobId }: { jobId: string }) {
  const { data: reminders = [], isLoading } = useJobReminders(jobId);

  return (
    <View className="gap-3">
      <Text className="font-sans-medium text-sm text-foreground">Reminders</Text>
      {isLoading ? (
        <Text className="text-sm text-muted-foreground">Loading…</Text>
      ) : reminders.length === 0 ? (
        <Text className="text-sm text-muted-foreground">No reminders.</Text>
      ) : (
        <View className="gap-2">
          {reminders.map((r) => (
            <View key={r.id} className="flex-row items-center justify-between gap-2">
              <Text
                className={`text-sm ${r.isCompleted ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                {r.message}
              </Text>
              <Text className="font-mono text-xs text-muted-foreground">
                {shortDate(r.remindAt)}
              </Text>
            </View>
          ))}
        </View>
      )}
      <Pressable
        accessibilityRole="link"
        accessibilityLabel="Manage reminders on the web"
        onPress={() => void Linking.openURL(`${WEB_BASE}/app/jobs?job=${jobId}`)}
        className="flex-row items-center gap-1">
        <Text className="text-xs font-sans-medium text-primary">Open on web</Text>
      </Pressable>
    </View>
  );
}
