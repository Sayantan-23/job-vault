import { X } from 'lucide-react-native';
import { Pressable, ScrollView, Text, View } from 'react-native-css/components';

import { Icon } from '@/components/icon';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Select, type SelectOption } from '@/components/ui/select';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import {
  GHOST_OPTIONS,
  DEFAULT_FILTERS,
  type JobFilters,
  type GhostFilter,
  type SortField,
  type SortOrder,
} from '@/types/filters';
import { JOB_STATUSES, STATUS_META, type JobStatus } from '@/lib/job-status';

// The web's filter state lives in the URL; native has no such equivalent, so
// the state is lifted into JobsScreen and this sheet edits it live — there is
// no Apply button, closing the sheet just puts the panel away. Reset restores
// DEFAULT_FILTERS verbatim.
export type FilterSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: JobFilters;
  onFiltersChange: (next: JobFilters) => void;
};

const STATUS_OPTIONS: readonly SelectOption<JobStatus | 'all'>[] = [
  { value: 'all', label: 'All statuses' },
  ...JOB_STATUSES.map((s) => ({ value: s, label: STATUS_META[s].label })),
];

const SORT_OPTIONS: readonly SelectOption<SortField>[] = [
  { value: 'title', label: 'Title' },
  { value: 'company', label: 'Company' },
  { value: 'lastActivityAt', label: 'Ghost' },
  { value: 'createdAt', label: 'Added' },
];

const GHOST_SEG: readonly { value: GhostFilter; label: string }[] = GHOST_OPTIONS;
const ORDER_SEG: readonly { value: SortOrder; label: string }[] = [
  { value: 'desc', label: 'Desc' },
  { value: 'asc', label: 'Asc' },
];

export function FilterSheet({
  open,
  onOpenChange,
  filters,
  onFiltersChange,
}: FilterSheetProps) {
  const set = <K extends keyof JobFilters>(key: K, value: JobFilters[K]) =>
    onFiltersChange({ ...filters, [key]: value });

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent hideClose>
        <View className="mb-4 flex-row items-center justify-between">
          <SheetTitle>Filter jobs</SheetTitle>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close"
            onPress={() => onOpenChange(false)}
            className="rounded-md p-1">
            <Icon icon={X} size={16} strokeWidth={2} className="text-muted-foreground" />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false}>
          <View className="gap-5 pb-2">
            <Field label="Search">
              <Input
                value={filters.search}
                onChangeText={(t) => set('search', t)}
                placeholder="Title or company"
                accessibilityLabel="Search"
              />
            </Field>

            <Field label="Status">
              <Select
                value={filters.status ?? 'all'}
                onValueChange={(v) =>
                  set('status', v === 'all' ? undefined : (v as JobStatus))
                }
                options={STATUS_OPTIONS}
                aria-label="Status"
              />
            </Field>

            <Field label="Activity">
              <SegmentedControl
                value={filters.ghost}
                onValueChange={(v) => set('ghost', v as GhostFilter)}
                options={GHOST_SEG}
                aria-label="Activity"
              />
            </Field>

            <Field label="Sort by">
              <Select
                value={filters.sortBy}
                onValueChange={(v) => set('sortBy', v as SortField)}
                options={SORT_OPTIONS}
                aria-label="Sort by"
              />
            </Field>

            <Field label="Sort order">
              <SegmentedControl
                value={filters.sortOrder}
                onValueChange={(v) => set('sortOrder', v as SortOrder)}
                options={ORDER_SEG}
                aria-label="Sort order"
              />
            </Field>

            <Field label="Added from">
              {/* ponytail: text date input, not a native picker — swap for
                  @expo/ui DateTimePicker if entry friction bites. */}
              <Input
                value={filters.createdFrom ?? ''}
                onChangeText={(t) => set('createdFrom', t || undefined)}
                placeholder="YYYY-MM-DD"
                accessibilityLabel="Added from"
              />
            </Field>

            <Field label="Added to">
              {/* ponytail: text date input, not a native picker. */}
              <Input
                value={filters.createdTo ?? ''}
                onChangeText={(t) => set('createdTo', t || undefined)}
                placeholder="YYYY-MM-DD"
                accessibilityLabel="Added to"
              />
            </Field>

            <Button
              variant="outline"
              size="sm"
              onPress={() => onFiltersChange({ ...DEFAULT_FILTERS })}>
              Reset filters
            </Button>
          </View>
        </ScrollView>
      </SheetContent>
    </Sheet>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="gap-1.5">
      <Text className="font-sans-medium text-xs text-muted-foreground">
        {label.toUpperCase()}
      </Text>
      {children}
    </View>
  );
}
