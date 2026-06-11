// frontend-next/src/components/profile/profile-skills-editor.tsx
'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { ChipInput } from './chip-input'
import { newSkillGroup } from '@/lib/profile'
import type { ProfileSkillGroup } from '@/types/profile'

interface Props {
  value: ProfileSkillGroup[]
  onChange: (next: ProfileSkillGroup[]) => void
  /** Hide the trailing add button when a host (e.g. the persona editor) provides its own. */
  showAddButton?: boolean
}

export function ProfileSkillsEditor({ value, onChange, showAddButton = true }: Props) {
  const setAt = (i: number, partial: Partial<ProfileSkillGroup>) =>
    onChange(value.map((g, idx) => (idx === i ? { ...g, ...partial } : g)))
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const add = () => onChange([...value, newSkillGroup()])

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">
        Add skills below. Leave the single default group for a flat list, or add categories (Languages, Frameworks…) to
        group them.
      </p>
      {value.map((group, i) => (
        <div key={group.id ?? i} className="space-y-2 rounded-lg border border-border p-4">
          <div className="flex items-center gap-2">
            <Input
              aria-label={`Skill group ${i + 1} category`}
              placeholder="Category"
              value={group.category}
              onChange={(e) => setAt(i, { category: e.target.value })}
              className="w-48"
            />
            <Button
              type="button"
              variant="softDestructive"
              size="iconSm"
              className="shrink-0"
              aria-label={`Remove skill group ${i + 1}`}
              onClick={() => remove(i)}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </div>
          <ChipInput
            value={group.items}
            ariaLabel={`Skill group ${i + 1} items`}
            placeholder="Add a skill and press Enter"
            onChange={(items) => setAt(i, { items })}
          />
        </div>
      ))}
      {showAddButton && (
        <Button type="button" variant="softPrimary" size="sm" onClick={add}>
          <Plus className="size-4" aria-hidden="true" />
          Add category
        </Button>
      )}
    </div>
  )
}
