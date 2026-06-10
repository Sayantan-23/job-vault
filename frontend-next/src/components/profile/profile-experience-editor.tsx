// frontend-next/src/components/profile/profile-experience-editor.tsx
'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { MonthYearPicker } from './month-year-picker'
import { BulletListEditor } from './bullet-list-editor'
import { newExperience } from '@/lib/profile'
import type { ProfileExperience } from '@/types/profile'

interface Props {
  value: ProfileExperience[]
  onChange: (next: ProfileExperience[]) => void
}

export function ProfileExperienceEditor({ value, onChange }: Props) {
  const setAt = (i: number, partial: Partial<ProfileExperience>) =>
    onChange(value.map((e, idx) => (idx === i ? { ...e, ...partial } : e)))
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const add = () => onChange([...value, newExperience()])

  return (
    <div className="space-y-4">
      {value.map((exp, i) => (
        <div key={exp.id ?? i} className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground">Experience {i + 1}</h4>
            <Button type="button" variant="ghost" size="sm" aria-label={`Remove experience ${i + 1}`} onClick={() => remove(i)}>
              Remove
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              aria-label={`Experience ${i + 1} company`}
              placeholder="Company"
              value={exp.company}
              onChange={(e) => setAt(i, { company: e.target.value })}
            />
            <Input
              aria-label={`Experience ${i + 1} role`}
              placeholder="Role"
              value={exp.role}
              onChange={(e) => setAt(i, { role: e.target.value })}
            />
            <Input
              aria-label={`Experience ${i + 1} location`}
              placeholder="Location"
              value={exp.location ?? ''}
              onChange={(e) => setAt(i, { location: e.target.value })}
            />
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
      <Button type="button" variant="outline" size="sm" onClick={add}>
        Add experience
      </Button>
    </div>
  )
}
