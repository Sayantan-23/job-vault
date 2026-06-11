// frontend-next/src/components/personas/persona-education-row.tsx
'use client'

import { Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { formatMonthYearRange } from '@/lib/profile'
import type { ProfileEducation } from '@/types/profile'

// Read-only education entry in a persona draft: education is managed on the
// profile (pick-only), so the only affordance here is Remove.
export function PersonaEducationRow({
  education,
  onRemove,
}: {
  education: ProfileEducation
  onRemove: () => void
}) {
  const title = personaEducationTitle(education)
  const dates = formatMonthYearRange(education.startDate, education.endDate, education.current)
  const subtitle = [education.fieldOfStudy, dates].filter((s) => s?.trim()).join(' · ')

  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2">
      <div className="min-w-0">
        <p className="truncate text-sm text-foreground">{title || 'Untitled education'}</p>
        {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      <Button
        type="button"
        variant="softDestructive"
        size="iconSm"
        aria-label={`Remove ${title || 'education'}`}
        onClick={onRemove}
      >
        <Trash2 className="size-4" aria-hidden="true" />
      </Button>
    </li>
  )
}

export const personaEducationTitle = (education: ProfileEducation): string =>
  [education.degree, education.institution].filter((s) => s.trim()).join(' — ')
