import { Sheet, SheetContent } from '@/components/ui/sheet';
import { ManualJobForm } from './manual-job-form';
import type { Job } from '@/types/job';

export interface EditJobSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  job?: Job | null;
}

export function EditJobSheet({ open, onOpenChange, job }: EditJobSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent hideClose>
        <ManualJobForm
          key={job?.id ?? 'new'}
          job={job}
          onClose={() => onOpenChange(false)}
        />
      </SheetContent>
    </Sheet>
  );
}

