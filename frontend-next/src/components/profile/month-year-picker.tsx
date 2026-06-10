// frontend-next/src/components/profile/month-year-picker.tsx
'use client'

import { Select } from '@/components/ui/select'
import type { MonthYear } from '@/types/profile'

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 60 }, (_, i) => CURRENT_YEAR - i)

interface Props {
  value: MonthYear | null
  onChange: (next: MonthYear | null) => void
  ariaPrefix: string
  disabled?: boolean
}

export function MonthYearPicker({ value, onChange, ariaPrefix, disabled }: Props) {
  const setYear = (raw: string) => {
    if (!raw) return onChange(null)
    onChange({ month: value?.month ?? null, year: Number(raw) })
  }
  const setMonth = (raw: string) => {
    if (!value) return // a month is meaningless without a year
    onChange({ ...value, month: raw ? Number(raw) : null })
  }

  return (
    <div className="flex gap-2">
      <Select
        aria-label={`${ariaPrefix} month`}
        value={value?.month ?? ''}
        onChange={(e) => setMonth(e.target.value)}
        disabled={disabled || !value}
        className="w-28"
      >
        <option value="">Month</option>
        {MONTHS.map((m, i) => (
          <option key={m} value={i + 1}>
            {m}
          </option>
        ))}
      </Select>
      <Select
        aria-label={`${ariaPrefix} year`}
        value={value?.year ?? ''}
        onChange={(e) => setYear(e.target.value)}
        disabled={disabled}
        className="w-28"
      >
        <option value="">Year</option>
        {YEARS.map((y) => (
          <option key={y} value={y}>
            {y}
          </option>
        ))}
      </Select>
    </div>
  )
}
