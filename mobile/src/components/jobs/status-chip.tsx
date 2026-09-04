import { Text } from 'react-native-css/components';

import { cn } from '@/components/ui/cn';
import { STATUS_META, type JobStatus } from '@/lib/job-status';

// Ported from frontend-next/src/components/kanban/status-chip.tsx. On RN the
// chip is a single Text: NativeWind applies both the surface (`bg-*`) and ink
// (`text-*`) classes to it, so the combined `meta.className` works on one
// element instead of the web's span-with-inheritance.
export function StatusChip({ status }: { status: JobStatus }) {
  const meta = STATUS_META[status];
  return (
    <Text
      accessibilityLabel={`Status: ${meta.label}`}
      className={cn(
        'rounded px-2 py-0.5 font-mono-medium text-[10px] uppercase',
        meta.className,
      )}>
      {meta.label}
    </Text>
  );
}
