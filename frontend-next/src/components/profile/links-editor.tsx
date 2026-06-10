// frontend-next/src/components/profile/links-editor.tsx
'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { newLink } from '@/lib/profile'
import type { ProfileLink } from '@/types/profile'

interface Props {
  value: ProfileLink[]
  onChange: (next: ProfileLink[]) => void
}

export function LinksEditor({ value, onChange }: Props) {
  const setAt = (i: number, partial: Partial<ProfileLink>) =>
    onChange(value.map((l, idx) => (idx === i ? { ...l, ...partial } : l)))
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const add = () => onChange([...value, newLink()])

  return (
    <div className="space-y-2">
      {value.map((link, i) => (
        <div key={link.id ?? i} className="flex items-center gap-2">
          <Input
            aria-label={`Link ${i + 1} label`}
            placeholder="Label (e.g. GitHub)"
            value={link.label}
            onChange={(e) => setAt(i, { label: e.target.value })}
            className="w-40"
          />
          <Input
            aria-label={`Link ${i + 1} url`}
            placeholder="https://…"
            value={link.url}
            onChange={(e) => setAt(i, { url: e.target.value })}
          />
          <Button type="button" variant="ghost" size="sm" aria-label={`Remove link ${i + 1}`} onClick={() => remove(i)}>
            Remove
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        Add link
      </Button>
    </div>
  )
}
