// frontend-next/src/components/profile/profile-experience-editor.tsx
'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Select } from '@/components/ui/select'
import { MonthYearPicker } from './month-year-picker'
import { BulletListEditor } from './bullet-list-editor'
import { newExperience } from '@/lib/profile'
import type { ProfileExperience, EmploymentType } from '@/types/profile'

const EMPLOYMENT_TYPES: { value: EmploymentType; label: string }[] = [
  { value: 'full-time', label: 'Full-time' },
  { value: 'part-time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'internship', label: 'Internship' },
  { value: 'self-employed', label: 'Self-employed' },
]

interface Props {
  value: ProfileExperience[]
  onChange: (next: ProfileExperience[]) => void
  /** Hide the trailing add button when a host (e.g. the persona editor) provides its own. */
  showAddButton?: boolean
}

export function ProfileExperienceEditor({ value, onChange, showAddButton = true }: Props) {
  const setAt = (i: number, partial: Partial<ProfileExperience>) =>
    onChange(value.map((e, idx) => (idx === i ? { ...e, ...partial } : e)))
  // employmentType is optional; clearing it omits the key (exactOptionalPropertyTypes
  // forbids assigning `undefined` to an optional-but-non-undefined property).
  const setEmploymentType = (i: number, raw: string) =>
    onChange(
      value.map((e, idx) => {
        if (idx !== i) return e
        if (!raw) {
          const rest = { ...e }
          delete rest.employmentType
          return rest
        }
        return { ...e, employmentType: raw as EmploymentType }
      }),
    )
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const add = () => onChange([...value, newExperience()])

  return (
    <div className="space-y-4">
      {value.map((exp, i) => (
        <div key={exp.id ?? i} className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground">Experience {i + 1}</h4>
            <Button
              type="button"
              variant="softDestructive"
              size="iconSm"
              aria-label={`Remove experience ${i + 1}`}
              onClick={() => remove(i)}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              aria-label={`Experience ${i + 1} company`}
              placeholder="Company (e.g. Stripe)"
              value={exp.company}
              onChange={(e) => setAt(i, { company: e.target.value })}
            />
            <Input
              aria-label={`Experience ${i + 1} role`}
              placeholder="Role (e.g. Senior Engineer)"
              value={exp.role}
              onChange={(e) => setAt(i, { role: e.target.value })}
            />
            <Input
              aria-label={`Experience ${i + 1} location`}
              placeholder="City, State"
              value={exp.location ?? ''}
              onChange={(e) => setAt(i, { location: e.target.value })}
            />
            <Select
              aria-label={`Experience ${i + 1} employment type`}
              value={exp.employmentType ?? ''}
              onChange={(e) => setEmploymentType(i, e.target.value)}
            >
              <option value="">Employment type</option>
              {EMPLOYMENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label>Start</Label>
              <MonthYearPicker
                value={exp.startDate}
                ariaPrefix={`Experience ${i + 1} start`}
                onChange={(startDate) => setAt(i, { startDate })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>End</Label>
              <MonthYearPicker
                value={exp.endDate}
                disabled={exp.current}
                ariaPrefix={`Experience ${i + 1} end`}
                onChange={(endDate) => setAt(i, { endDate })}
              />
            </div>
            <label className="flex items-center gap-2 pb-2.5 text-sm text-foreground">
              <Checkbox
                aria-label={`Experience ${i + 1} currently working here`}
                checked={exp.current}
                onChange={(e) => setAt(i, { current: e.target.checked, endDate: e.target.checked ? null : exp.endDate })}
              />
              I currently work here
            </label>
          </div>
          <div className="space-y-1.5">
            <Label>Highlights</Label>
            <BulletListEditor
              value={exp.bullets}
              ariaPrefix={`Experience ${i + 1} bullet`}
              onChange={(bullets) => setAt(i, { bullets })}
            />
          </div>
        </div>
      ))}
      {showAddButton && (
        <Button type="button" variant="softPrimary" size="sm" onClick={add}>
          <Plus className="size-4" aria-hidden="true" />
          Add experience
        </Button>
      )}
    </div>
  )
}
