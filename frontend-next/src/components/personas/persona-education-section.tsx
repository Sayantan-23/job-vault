// frontend-next/src/components/personas/persona-education-section.tsx
'use client'

import Link from 'next/link'
import { PersonaItemPicker } from './persona-item-picker'
import { PersonaEducationRow, personaEducationTitle } from './persona-education-row'
import { formatMonthYearRange } from '@/lib/profile'
import type { ProfileEducation } from '@/types/profile'

// Pick-only persona education: entries are snapshots picked from the master
// profile (or AI-imported) and render read-only with Remove; no add, no inline
// edit — education itself is managed on /app/profile.
interface Props {
  value: ProfileEducation[]
  onChange: (next: ProfileEducation[]) => void
  profileEducation: ProfileEducation[]
}

export function PersonaEducationSection({ value, onChange, profileEducation }: Props) {
  const selectedIds = new Set(
    value.map((e) => e.id).filter((id): id is string => id !== undefined),
  )

  return (
    <div className="space-y-4">
      {value.length > 0 ? (
        <ul
          aria-label="Included education"
          className="divide-y divide-border rounded-lg border border-border bg-card"
        >
          {value.map((edu, i) => (
            <PersonaEducationRow
              key={edu.id ?? i}
              education={edu}
              onRemove={() => onChange(value.filter((_, idx) => idx !== i))}
            />
          ))}
        </ul>
      ) : null}
      <PersonaItemPicker<ProfileEducation>
        label="Profile education picker"
        profileItems={profileEducation}
        selectedIds={selectedIds}
        getTitle={personaEducationTitle}
        getSubtitle={(e) => formatMonthYearRange(e.startDate, e.endDate, e.current)}
        onAdd={(items) => onChange([...value, ...items])}
        onRemove={(ids) => onChange(value.filter((e) => e.id === undefined || !ids.includes(e.id)))}
        emptyHint="No education in your profile yet — add it on your Profile page."
      />
      <ManageEducationLink />
    </div>
  )
}

function ManageEducationLink() {
  return (
    <Link
      href="/app/profile"
      className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
    >
      Manage education in your profile
      <span aria-hidden="true">&rarr;</span>
    </Link>
  )
}
