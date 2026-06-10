// frontend-next/src/components/profile/bullet-list-editor.tsx
'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface Props {
  value: string[]
  onChange: (next: string[]) => void
  ariaPrefix: string
  placeholder?: string
}

export function BulletListEditor({
  value,
  onChange,
  ariaPrefix,
  placeholder = 'Describe an achievement or responsibility — start with an action verb.',
}: Props) {
  const setAt = (i: number, text: string) => onChange(value.map((b, idx) => (idx === i ? text : b)))
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const add = () => onChange([...value, ''])

  return (
    <div className="space-y-2">
      {value.map((bullet, i) => (
        <div key={i} className="flex items-start gap-2">
          <Textarea
            aria-label={`${ariaPrefix} ${i + 1}`}
            placeholder={placeholder}
            value={bullet}
            rows={2}
            onChange={(e) => setAt(i, e.target.value)}
          />
          <Button
            type="button"
            variant="softDestructive"
            size="iconSm"
            className="mt-1 shrink-0"
            aria-label={`Remove bullet ${i + 1}`}
            onClick={() => remove(i)}
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="softPrimary" size="sm" onClick={add}>
        <Plus className="size-4" aria-hidden="true" />
        Add bullet
      </Button>
    </div>
  )
}
