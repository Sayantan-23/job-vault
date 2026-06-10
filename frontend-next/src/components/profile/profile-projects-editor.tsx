// frontend-next/src/components/profile/profile-projects-editor.tsx
'use client'

import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { ChipInput } from './chip-input'
import { BulletListEditor } from './bullet-list-editor'
import { LinksEditor } from './links-editor'
import { MonthYearPicker } from './month-year-picker'
import { newProject } from '@/lib/profile'
import type { ProfileProject } from '@/types/profile'

interface Props {
  value: ProfileProject[]
  onChange: (next: ProfileProject[]) => void
}

export function ProfileProjectsEditor({ value, onChange }: Props) {
  const setAt = (i: number, partial: Partial<ProfileProject>) =>
    onChange(value.map((p, idx) => (idx === i ? { ...p, ...partial } : p)))
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const add = () => onChange([...value, newProject()])

  return (
    <div className="space-y-4">
      {value.map((proj, i) => (
        <div key={proj.id ?? i} className="space-y-3 rounded-lg border border-border p-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium text-muted-foreground">Project {i + 1}</h4>
            <Button type="button" variant="ghost" size="sm" aria-label={`Remove project ${i + 1}`} onClick={() => remove(i)}>
              Remove
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              aria-label={`Project ${i + 1} name`}
              placeholder="Project name"
              value={proj.name}
              onChange={(e) => setAt(i, { name: e.target.value })}
            />
            <Input
              aria-label={`Project ${i + 1} role`}
              placeholder="Your role (optional)"
              value={proj.role ?? ''}
              onChange={(e) => setAt(i, { role: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Description</Label>
            <Textarea
              aria-label={`Project ${i + 1} description`}
              rows={2}
              value={proj.description ?? ''}
              onChange={(e) => setAt(i, { description: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Technologies</Label>
            <ChipInput
              value={proj.technologies}
              ariaLabel={`Project ${i + 1} technologies`}
              onChange={(technologies) => setAt(i, { technologies })}
            />
          </div>
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label>Start</Label>
              <MonthYearPicker value={proj.startDate} ariaPrefix={`Project ${i + 1} start`} onChange={(startDate) => setAt(i, { startDate })} />
            </div>
            <div className="space-y-1.5">
              <Label>End</Label>
              <MonthYearPicker
                value={proj.endDate}
                disabled={proj.inProgress}
                ariaPrefix={`Project ${i + 1} end`}
                onChange={(endDate) => setAt(i, { endDate })}
              />
            </div>
            <label className="flex items-center gap-2 pb-2.5 text-sm text-foreground">
              <Checkbox
                aria-label={`Project ${i + 1} ongoing`}
                checked={proj.inProgress}
                onChange={(e) => setAt(i, { inProgress: e.target.checked, endDate: e.target.checked ? null : proj.endDate })}
              />
              Ongoing
            </label>
          </div>
          <div className="space-y-1.5">
            <Label>Highlights</Label>
            <BulletListEditor value={proj.bullets} ariaPrefix={`Project ${i + 1} bullet`} onChange={(bullets) => setAt(i, { bullets })} />
          </div>
          <div className="space-y-1.5">
            <Label>Links</Label>
            <LinksEditor value={proj.links} onChange={(links) => setAt(i, { links })} />
          </div>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        Add project
      </Button>
    </div>
  )
}
