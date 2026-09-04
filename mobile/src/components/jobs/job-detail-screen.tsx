import { useEffect } from 'react';
import { ScrollView, View } from 'react-native-css/components';
import { useQueryClient } from '@tanstack/react-query';

import { RouteProgress } from '@/components/ui/route-progress';
import { Skeleton } from '@/components/ui/skeleton';
import { useJob } from '@/hooks/use-jobs';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { SCREEN_BOTTOM_INSET } from '@/theme';
import { jobKey } from '@/lib/query-keys';

import { JobDetailHeader } from './sections/job-detail-header';
import { JobDetails } from './sections/job-details';
import { OutreachSection } from './sections/outreach-section';
import { JobSnapshot } from './sections/job-snapshot';
import { RemindersSection } from './sections/reminders-section';
import { ResumeLauncher } from './sections/resume-launcher';
import { CoverLetterLauncher } from './sections/cover-letter-launcher';
import { TimelineSection } from './sections/timeline-section';
import { JobDetailFooter } from './sections/job-detail-footer';

export { JobDetailHeader, JobDetails, OutreachSection, JobSnapshot, RemindersSection, ResumeLauncher, CoverLetterLauncher, TimelineSection, JobDetailFooter };

export function JobDetailScreen({ id }: { id: string }) {
  const { data: job, isLoading } = useJob(id);
  const queryClient = useQueryClient();

  // Realtime: invalidate this job's cache when a job:updated event lands for it.
  // The backend does not yet emit `job:updated` (only `notification`), so this
  // listener is dormant until that event is added — wired now per the C3 plan so
  // it lights up the moment the backend ships it.
  // ponytail: two effects over one hook — extract if a third screen needs it.
  useEffect(() => {
    const socket = connectSocket();
    const onJobUpdated = (payload: { id?: string } | string) => {
      const changedId = typeof payload === 'string' ? payload : payload?.id;
      if (changedId === id) {
        void queryClient.invalidateQueries({ queryKey: jobKey(id) });
      }
    };
    socket.on('job:updated', onJobUpdated);
    return () => {
      socket.off('job:updated', onJobUpdated);
      disconnectSocket();
    };
  }, [id, queryClient]);

  if (isLoading || !job) {
    return (
      <View className="flex-1 bg-background">
        <RouteProgress />
        <View className="p-5">
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="mt-3 h-4 w-1/2" />
          <Skeleton className="mt-6 h-24 w-full" />
          <Skeleton className="mt-4 h-24 w-full" />
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: SCREEN_BOTTOM_INSET }}>
        {/* Sticky header/footer are DIRECT children of the ScrollView so they
            pin across all content — a nested sticky only sticks within its own
            short section and un-pins once scrolled past (web job-details.tsx:22). */}
        <JobDetailHeader job={job} />
        <View className="gap-6 p-5">
          <JobDetails job={job} />
          <View className="border-t border-hairline pt-5">
            <OutreachSection jobId={job.id} />
          </View>
          <View className="border-t border-hairline pt-5">
            <JobSnapshot markdown={job.snapshotMarkdown} sourceUrl={job.sourceUrl} />
          </View>
          <View className="border-t border-hairline pt-5">
            <RemindersSection jobId={job.id} />
          </View>
          <View className="border-t border-hairline pt-5">
            <ResumeLauncher jobId={job.id} />
          </View>
          <View className="border-t border-hairline pt-5">
            <CoverLetterLauncher jobId={job.id} />
          </View>
          <View className="border-t border-hairline pt-5">
            <TimelineSection jobId={job.id} />
          </View>
        </View>
        <JobDetailFooter job={job} />
      </ScrollView>
    </View>
  );
}
