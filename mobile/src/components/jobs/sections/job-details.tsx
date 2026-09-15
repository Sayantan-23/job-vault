import { Text, View } from 'react-native-css/components';

import { useTheme } from '@/hooks/use-theme';
import { LIGHT_COLORS } from '@/theme';
import type { Job } from '@/types/job';

// Notes, location, salary range. The web's JobDetails also owns the status
// Select + a notes Textarea with a Save button; C3 moves the status chip to the
// header and renders notes read-only (no notes CRUD on mobile yet).
// ponytail: read-only notes — editing is a later slice.
export function JobDetails({ job }: { job: Job }) {
  const { colors = LIGHT_COLORS } = useTheme() ?? {};

  return (
    <View className="gap-2">
      {job.location ? (
        <Text style={{ color: colors.mutedForeground }} className="text-sm text-muted-foreground">
          {job.location}
        </Text>
      ) : null}
      {job.salaryRange ? (
        <Text style={{ color: colors.mutedForeground }} className="font-mono text-xs text-muted-foreground">
          {job.salaryRange}
        </Text>
      ) : null}
      {job.notes ? (
        <Text style={{ color: colors.foreground }} className="text-sm leading-relaxed text-foreground">
          {job.notes}
        </Text>
      ) : (
        <Text style={{ color: colors.mutedForeground }} className="text-sm text-muted-foreground">
          No notes.
        </Text>
      )}
    </View>
  );
}
