// frontend-next/src/components/profile/profile-education-editor.tsx
'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { MonthYearPicker } from './month-year-picker'
import { BulletListEditor } from './bullet-list-editor'
import { newEducation } from '@/lib/profile'
import type { ProfileEducation } from '@/types/profile'

interface Props {
  value: ProfileEducation[]
  onChange: (next: ProfileEducation[]) => void
}

export function ProfileEducationEditor({ value, onChange }: Props) {
  const setAt = (i: number, partial: Partial<ProfileEducation>) =>
    onChange(value.map((e, idx) => (idx === i ? { ...e, ...partial } : e)))
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const add = () => onChange([...value, newEducation()])

  return (
    <div className="space-y-4">
      {value.map((edu, i) => (
        <div key={edu.id ?? i} className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground">Education {i + 1}</h4>
            <Button type="button" variant="ghost" size="sm" aria-label={`Remove education ${i + 1}`} onClick={() => remove(i)}>
              Remove
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              aria-label={`Education ${i + 1} degree`}
              placeholder="Degree (e.g. B.Tech)"
              value={edu.degree}
              onChange={(e) => setAt(i, { degree: e.target.value })}
            />
            <Input
              aria-label={`Education ${i + 1} institution`}
              placeholder="Institution"
              value={edu.institution}
              onChange={(e) => setAt(i, { institution: e.target.value })}
            />
            <Input
              aria-label={`Education ${i + 1} field of study`}
              placeholder="Field of study"
              value={edu.fieldOfStudy ?? ''}
              onChange={(e) => setAt(i, { fieldOfStudy: e.target.value })}
            />
            <Input
              aria-label={`Education ${i + 1} location`}
              placeholder="Location"
              value={edu.location ?? ''}
              onChange={(e) => setAt(i, { location: e.target.value })}
            />
            <Input
              aria-label={`Education ${i + 1} grade`}
              placeholder="Grade (e.g. 8.5/10 CGPA, 85%)"
              value={edu.grade ?? ''}
              onChange={(e) => setAt(i, { grade: e.target.value })}
            />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label>Start</Label>
              <MonthYearPicker value={edu.startDate} ariaPrefix={`Education ${i + 1} start`} onChange={(startDate) => setAt(i, { startDate })} />
            </div>
            <div className="space-y-1.5">
              <Label>End</Label>
              <MonthYearPicker
                value={edu.endDate}
                disabled={edu.current}
                ariaPrefix={`Education ${i + 1} end`}
                onChange={(endDate) => setAt(i, { endDate })}
              />
            </div>
            <label className="flex items-center gap-2 pb-2.5 text-sm text-foreground">
              <Checkbox
                aria-label={`Education ${i + 1} currently studying`}
                checked={edu.current}
                onChange={(e) => setAt(i, { current: e.target.checked, endDate: e.target.checked ? null : edu.endDate })}
              />
              Currently studying
            </label>
          </div>
          <div className="space-y-1.5">
            <Label>Highlights</Label>
            <BulletListEditor
              value={edu.bullets}
              ariaPrefix={`Education ${i + 1} bullet`}
              onChange={(bullets) => setAt(i, { bullets })}
            />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        Add education
      </Button>
    </div>
  )
}
