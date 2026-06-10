// frontend-next/src/components/profile/bullet-list-editor.tsx
'use client'

import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

interface Props {
  value: string[]
  onChange: (next: string[]) => void
  ariaPrefix: string
}

export function BulletListEditor({ value, onChange, ariaPrefix }: Props) {
  const setAt = (i: number, text: string) => onChange(value.map((b, idx) => (idx === i ? text : b)))
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const add = () => onChange([...value, ''])

  return (
    <div className="space-y-2">
      {value.map((bullet, i) => (
        <div key={i} className="flex items-start gap-2">
          <Textarea
            aria-label={`${ariaPrefix} ${i + 1}`}
            value={bullet}
            rows={2}
            onChange={(e) => setAt(i, e.target.value)}
          />
          <Button type="button" variant="ghost" size="sm" aria-label={`Remove bullet ${i + 1}`} onClick={() => remove(i)}>
            Remove
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={add}>
        Add bullet
      </Button>
    </div>
  )
}
