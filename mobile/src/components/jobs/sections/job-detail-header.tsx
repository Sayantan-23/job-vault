import { useRouter } from 'expo-router';
import { ChevronLeft, ExternalLink } from 'lucide-react-native';
import { Linking } from 'react-native';
import { Pressable, Text, View } from 'react-native-css/components';

import { Icon } from '@/components/icon';
import { IconButton } from '@/components/ui/icon-button';
import { Select, type SelectOption } from '@/components/ui/select';
import { useUpdateJob } from '@/hooks/use-jobs';
import { JOB_STATUSES, STATUS_META, type JobStatus } from '@/lib/job-status';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Job } from '@/types/job';

const STATUS_OPTIONS: readonly SelectOption<JobStatus>[] = JOB_STATUSES.map((s) => ({
  value: s,
  label: STATUS_META[s].label,
}));

// Sticky header: back button + identity (title serif, company·location) + the
// status chip (a Select → useUpdateJob) + the source link. Direct child of the
// ScrollView so it pins across all content (web job-details.tsx:22).
export function JobDetailHeader({ job }: { job: Job }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const update = useUpdateJob(job.id);

  return (
    <View
      className="border-b border-hairline bg-card px-5 pb-3"
      style={{ paddingTop: insets.top + 8 }}>
      <View className="flex-row items-center gap-2">
        <IconButton
          icon={ChevronLeft}
          accessibilityLabel="Back"
          onPress={() => router.back()}
        />
        <View className="min-w-0 flex-1">
          <Text
            numberOfLines={2}
            className="font-serif text-xl leading-tight text-foreground">
            {job.title}
          </Text>
          <Text className="text-sm text-muted-foreground">
            {job.company}
            {job.location ? ` · ${job.location}` : ''}
          </Text>
        </View>
      </View>
      <View className="mt-3 flex-row items-center justify-between gap-3">
        <View className="flex-1">
          <Select<JobStatus>
            value={job.status}
            onValueChange={(status) => update.mutate({ status })}
            options={STATUS_OPTIONS}
            aria-label="Status"
          />
        </View>
        {job.sourceUrl ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="View original posting"
            onPress={() => void Linking.openURL(job.sourceUrl!)}
            className="flex-row items-center gap-1">
            <Icon icon={ExternalLink} size={14} strokeWidth={1.75} className="text-primary" />
            <Text className="text-xs font-sans-medium text-primary">Source</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}
