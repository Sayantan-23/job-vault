import { useState } from 'react';
import { useRouter } from 'expo-router';
import { View } from 'react-native-css/components';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useDeleteJob } from '@/hooks/use-jobs';
import type { Job } from '@/types/job';

// Sticky footer: the one destructive action, pinned to the bottom of the scroll
// area. ConfirmDialog gates the delete; on success the screen navigates home.
export function JobDetailFooter({ job }: { job: Job }) {
  const router = useRouter();
  const remove = useDeleteJob();
  const [confirmOpen, setConfirmOpen] = useState(false);

  const onConfirm = () => {
    setConfirmOpen(false);
    remove.mutate(job.id, {
      onSuccess: () => {
        router.navigate('/');
      },
    });
  };

  return (
    <View className="border-t border-hairline bg-card px-5 py-3">
      <View className="flex-row justify-end">
        <Button
          variant="destructive"
          size="sm"
          accessibilityLabel="Delete job"
          disabled={remove.isPending}
          onPress={() => setConfirmOpen(true)}>
          Delete job
        </Button>
      </View>
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Delete job?"
        description={`"${job.title}" at ${job.company} will be permanently deleted, along with its timeline, reminders, and any cover letters generated from it.`}
        confirmLabel="Delete"
        destructive
        onConfirm={onConfirm}
      />
    </View>
  );
}
