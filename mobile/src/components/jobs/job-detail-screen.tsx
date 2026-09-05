import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native-css/components';
import { useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2 } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BlurTargetView } from 'expo-blur';

import { BlurTargetProvider } from '@/components/ui/blur-target';
import { RouteProgress } from '@/components/ui/route-progress';
import { Skeleton } from '@/components/ui/skeleton';
import { SpeedDial } from '@/components/ui/speed-dial';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useDeleteJob, useJob } from '@/hooks/use-jobs';
import { connectSocket, disconnectSocket } from '@/lib/socket';
import { jobKey } from '@/lib/query-keys';

import { JobDetailHeader } from './sections/job-detail-header';
import { JobDetails } from './sections/job-details';
import { OutreachSection } from './sections/outreach-section';
import { JobSnapshot } from './sections/job-snapshot';
import { RemindersSection } from './sections/reminders-section';
import { ResumeLauncher } from './sections/resume-launcher';
import { CoverLetterLauncher } from './sections/cover-letter-launcher';
import { TimelineSection } from './sections/timeline-section';
import { EditJobSheet } from './edit-job-sheet';

export function JobDetailScreen({ id }: { id: string }) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { data: job, isLoading } = useJob(id);
  const remove = useDeleteJob();
  const queryClient = useQueryClient();
  const blurTargetRef = useRef<any>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Realtime: invalidate this job's cache when a job:updated event lands for it.
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

  const fabBottom = Math.max(insets.bottom, 16) + 8;

  const onConfirmDelete = () => {
    setConfirmOpen(false);
    remove.mutate(job.id, {
      onSuccess: () => {
        router.navigate('/');
      },
    });
  };

  const dialActions = [
    {
      key: 'delete',
      label: 'Delete job',
      icon: Trash2,
      variant: 'destructive' as const,
      accessibilityLabel: 'Delete job',
      onPress: () => setConfirmOpen(true),
    },
    {
      key: 'edit',
      label: 'Edit job',
      icon: Pencil,
      accessibilityLabel: 'Edit job',
      onPress: () => setEditOpen(true),
    },
  ];

  return (
    <BlurTargetProvider blurTarget={blurTargetRef}>
      <View className="flex-1 bg-background">
        <BlurTargetView ref={blurTargetRef} style={{ flex: 1 }}>
          <JobDetailHeader job={job} />
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingBottom: fabBottom + 64 }}>
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
          </ScrollView>
        </BlurTargetView>

        {/* Floating SpeedDial replacing the fixed bottom bar */}
        <SpeedDial
          actions={dialActions}
          accessibilityLabel="Job actions"
          bottom={fabBottom}
          blurTarget={blurTargetRef}
        />

        <EditJobSheet open={editOpen} onOpenChange={setEditOpen} job={job} />

        <ConfirmDialog
          open={confirmOpen}
          onOpenChange={setConfirmOpen}
          title="Delete job?"
          description={`"${job.title}" at ${job.company} will be permanently deleted, along with its timeline, reminders, and any cover letters generated from it.`}
          confirmLabel="Delete"
          destructive
          onConfirm={onConfirmDelete}
        />
      </View>
    </BlurTargetProvider>
  );
}
