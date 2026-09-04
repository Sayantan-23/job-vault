import { Text, View } from 'react-native-css/components';

import type { Job } from '@/types/job';

// Notes, location, salary range. The web's JobDetails also owns the status
// Select + a notes Textarea with a Save button; C3 moves the status chip to the
// header and renders notes read-only (no notes CRUD on mobile yet).
// ponytail: read-only notes — editing is a later slice.
export function JobDetails({ job }: { job: Job }) {
  return (
    <View className="gap-2">
      {job.location ? (
        <Text className="text-sm text-muted-foreground">{job.location}</Text>
      ) : null}
      {job.salaryRange ? (
        <Text className="font-mono text-xs text-muted-foreground">
          {job.salaryRange}
        </Text>
      ) : null}
      {job.notes ? (
        <Text className="text-sm leading-relaxed text-foreground">{job.notes}</Text>
      ) : (
        <Text className="text-sm text-muted-foreground">No notes.</Text>
      )}
    </View>
  );
}
