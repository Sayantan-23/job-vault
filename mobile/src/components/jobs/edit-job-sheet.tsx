import { useState } from 'react';
import { X } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native-css/components';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useCreateJob, useUpdateJob } from '@/hooks/use-jobs';
import type { Job } from '@/types/job';

export interface EditJobSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job?: Job | null;
}

function EditJobSheetBody({
  job,
  onClose,
}: {
  job?: Job | null;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(job?.title ?? '');
  const [company, setCompany] = useState(job?.company ?? '');
  const [location, setLocation] = useState(job?.location ?? '');
  const [salaryRange, setSalaryRange] = useState(job?.salaryRange ?? '');
  const [sourceUrl, setSourceUrl] = useState(job?.sourceUrl ?? '');
  const [notes, setNotes] = useState(job?.notes ?? '');

  const createMutation = useCreateJob();
  const updateMutation = useUpdateJob(job?.id ?? '');

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  const canSave = title.trim().length > 0 && company.trim().length > 0 && !isSaving;

  const handleSave = () => {
    if (!canSave) return;

    if (job) {
      updateMutation.mutate(
        {
          title: title.trim(),
          company: company.trim(),
          location: location.trim() || undefined,
          salaryRange: salaryRange.trim() || undefined,
          sourceUrl: sourceUrl.trim() || undefined,
          notes: notes.trim() || undefined,
        },
        {
          onSuccess: onClose,
        }
      );
    } else {
      createMutation.mutate(
        {
          title: title.trim(),
          company: company.trim(),
          location: location.trim() || undefined,
          salaryRange: salaryRange.trim() || undefined,
          sourceUrl: sourceUrl.trim() || undefined,
          notes: notes.trim() || undefined,
        },
        {
          onSuccess: onClose,
        }
      );
    }
  };

  return (
    <>
      <View className="mb-3 flex-row items-center justify-between">
        <SheetTitle>{job ? 'Edit job' : 'New job'}</SheetTitle>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close sheet"
          onPress={onClose}
          className="rounded-md p-1">
          <Icon icon={X} size={16} strokeWidth={2} className="text-muted-foreground" />
        </Pressable>
      </View>

      {error ? (
        <View className="mb-3 rounded-md bg-destructive/10 p-2.5">
          <Text className="text-xs text-destructive">
            {error instanceof Error ? error.message : 'An error occurred'}
          </Text>
        </View>
      ) : null}

      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="gap-4 pb-6">
          <View className="gap-1.5">
            <Text className="font-sans-medium text-xs text-muted-foreground">TITLE *</Text>
            <Input
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Senior Frontend Engineer"
              accessibilityLabel="Job title"
            />
          </View>

          <View className="gap-1.5">
            <Text className="font-sans-medium text-xs text-muted-foreground">COMPANY *</Text>
            <Input
              value={company}
              onChangeText={setCompany}
              placeholder="e.g. Acme Corp"
              accessibilityLabel="Company"
            />
          </View>

          <View className="gap-1.5">
            <Text className="font-sans-medium text-xs text-muted-foreground">LOCATION</Text>
            <Input
              value={location}
              onChangeText={setLocation}
              placeholder="e.g. Remote (US) or San Francisco, CA"
              accessibilityLabel="Location"
            />
          </View>

          <View className="gap-1.5">
            <Text className="font-sans-medium text-xs text-muted-foreground">SALARY RANGE</Text>
            <Input
              value={salaryRange}
              onChangeText={setSalaryRange}
              placeholder="e.g. $140,000 - $180,000"
              accessibilityLabel="Salary range"
            />
          </View>

          <View className="gap-1.5">
            <Text className="font-sans-medium text-xs text-muted-foreground">JOB POSTING URL</Text>
            <Input
              value={sourceUrl}
              onChangeText={setSourceUrl}
              placeholder="https://..."
              keyboardType="url"
              autoCapitalize="none"
              accessibilityLabel="Source URL"
            />
          </View>

          <View className="gap-1.5">
            <Text className="font-sans-medium text-xs text-muted-foreground">NOTES</Text>
            <Textarea
              value={notes}
              onChangeText={setNotes}
              placeholder="Personal notes, referral info, interview observations…"
              accessibilityLabel="Notes"
            />
          </View>

          <View className="mt-2 flex-row justify-end gap-3 border-t border-border/70 pt-4">
            <Button variant="outline" onPress={onClose} disabled={isSaving}>
              Cancel
            </Button>
            <Button onPress={handleSave} disabled={!canSave}>
              {isSaving ? 'Saving…' : job ? 'Save changes' : 'Add job'}
            </Button>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

export function EditJobSheet({ open, onOpenChange, job }: EditJobSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent hideClose>
        <EditJobSheetBody
          key={job?.id ?? 'new'}
          job={job}
          onClose={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
