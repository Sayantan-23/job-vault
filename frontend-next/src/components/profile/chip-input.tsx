// frontend-next/src/components/profile/chip-input.tsx
'use client'

import { useState, type KeyboardEvent } from 'react'
import { X } from 'lucide-react'
import { Input } from '@/components/ui/input'

interface Props {
  value: string[]
  onChange: (next: string[]) => void
  ariaLabel: string
  placeholder?: string
}

export function ChipInput({ value, onChange, ariaLabel, placeholder = 'Type and press Enter' }: Props) {
  const [draft, setDraft] = useState('')

  const add = () => {
    const trimmed = draft.trim()
    if (!trimmed || value.includes(trimmed)) {
      setDraft('')
      return
    }
    onChange([...value, trimmed])
    setDraft('')
  }
  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      add()
    }
  }
  const remove = (chip: string) => onChange(value.filter((c) => c !== chip))

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {value.map((chip) => (
          <span
            key={chip}
            className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-1 text-xs text-foreground"
          >
            {chip}
            <button
              type="button"
              aria-label={`Remove ${chip}`}
              onClick={() => remove(chip)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </span>
        ))}
      </div>
      <Input
        aria-label={ariaLabel}
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={add}
      />
    </div>
  )
}
