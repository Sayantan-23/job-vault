import { View } from 'react-native-css/components';

import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import type { MonthYear } from '@/types/profile';

const MONTH_OPTIONS = [
  { value: 'none', label: 'Month' },
  { value: '1', label: 'Jan' },
  { value: '2', label: 'Feb' },
  { value: '3', label: 'Mar' },
  { value: '4', label: 'Apr' },
  { value: '5', label: 'May' },
  { value: '6', label: 'Jun' },
  { value: '7', label: 'Jul' },
  { value: '8', label: 'Aug' },
  { value: '9', label: 'Sep' },
  { value: '10', label: 'Oct' },
  { value: '11', label: 'Nov' },
  { value: '12', label: 'Dec' },
] as const;

export interface MonthYearPickerProps {
  value: MonthYear | null;
  onChange: (val: MonthYear | null) => void;
  disabled?: boolean;
  yearAccessibilityLabel?: string;
}

export function MonthYearPicker({
  value,
  onChange,
  disabled = false,
  yearAccessibilityLabel = 'Year',
}: MonthYearPickerProps) {
  const monthStr = value?.month ? String(value.month) : 'none';
  const yearStr = value?.year ? String(value.year) : '';

  const handleMonthChange = (nextMonth: string) => {
    const m = nextMonth === 'none' ? null : parseInt(nextMonth, 10);
    const y = value?.year ?? new Date().getFullYear();
    onChange({ month: m, year: y });
  };

  const handleYearChange = (text: string) => {
    const clean = text.replace(/[^0-9]/g, '').slice(0, 4);
    if (!clean) {
      if (value?.month) {
        onChange({ month: value.month, year: 0 });
      } else {
        onChange(null);
      }
      return;
    }
    const y = parseInt(clean, 10);
    onChange({ month: value?.month ?? null, year: y });
  };

  return (
    <View className="flex-row items-center gap-2">
      <View className="w-28 flex-shrink-0">
        <Select
          value={monthStr}
          options={MONTH_OPTIONS}
          onValueChange={handleMonthChange}
          disabled={disabled}
          aria-label="Month"
        />
      </View>
      <View className="flex-1">
        <Input
          value={yearStr}
          onChangeText={handleYearChange}
          placeholder="YYYY"
          keyboardType="numeric"
          maxLength={4}
          editable={!disabled}
          accessibilityLabel={yearAccessibilityLabel}
        />
      </View>
    </View>
  );
}
