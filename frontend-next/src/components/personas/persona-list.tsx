'use client'

import type { Persona } from '@/types/persona'
import { PersonaCard } from './persona-card'

interface Props {
  personas: Persona[]
  onEdit: (persona: Persona) => void
}

export function PersonaList({ personas, onEdit }: Props) {
  if (personas.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center">
        <p className="text-sm font-medium">No personas yet</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
          Create a persona to start generating tailored résumés and cover letters.
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {personas.map((p) => (
        <PersonaCard key={p.id} persona={p} onEdit={onEdit} />
      ))}
    </div>
  )
}
