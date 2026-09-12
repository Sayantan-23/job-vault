import { useState } from 'react';
import { Globe, PenLine, X } from 'lucide-react-native';
import { Pressable, View } from 'react-native-css/components';

import { Icon } from '@/components/icon';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { SegmentedControl, type SegmentedOption } from '@/components/ui/segmented-control';
import { UrlCaptureForm } from './url-capture-form';
import { ManualJobForm } from './manual-job-form';
import type { CreateJobValues } from '@/types/job';

export type AddJobTab = 'url' | 'manual';

const TAB_OPTIONS: readonly SegmentedOption<AddJobTab>[] = [
  { value: 'url', label: 'From URL', icon: Globe },
  { value: 'manual', label: 'Manual', icon: PenLine },
];

export interface AddJobSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialUrl?: string;
  autoFetch?: boolean;
}

function AddJobSheetBody({
  initialUrl,
  autoFetch,
  onClose,
}: {
  initialUrl?: string;
  autoFetch?: boolean;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<AddJobTab>('url');
  const [prefill, setPrefill] = useState<Partial<CreateJobValues> | undefined>(undefined);

  const handleClose = () => {
    setTab('url');
    setPrefill(undefined);
    onClose();
  };

  return (
    <>
      <View className="mb-3 flex-row items-center justify-between">
        <SheetTitle>Add a job</SheetTitle>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close add job sheet"
          onPress={handleClose}
          className="rounded-md p-1">
          <Icon icon={X} size={16} strokeWidth={2} className="text-muted-foreground" />
        </Pressable>
      </View>

      <View className="mb-4">
        <SegmentedControl<AddJobTab>
          value={tab}
          onValueChange={setTab}
          options={TAB_OPTIONS}
          aria-label="Add job method"
          fullWidth
        />
      </View>

      {tab === 'url' ? (
        <UrlCaptureForm
          initialUrl={initialUrl}
          autoFetch={autoFetch}
          onCreated={handleClose}
          onSwitchToManual={(data) => {
            setPrefill(data);
            setTab('manual');
          }}
        />
      ) : (
        <ManualJobForm
          initialValues={prefill}
          hideHeader
          onClose={handleClose}
        />
      )}
    </>
  );
}

export function AddJobSheet({
  open,
  onOpenChange,
  initialUrl,
  autoFetch,
}: AddJobSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent hideClose>
        <AddJobSheetBody
          key={open ? 'open' : 'closed'}
          initialUrl={initialUrl}
          autoFetch={autoFetch}
          onClose={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}
