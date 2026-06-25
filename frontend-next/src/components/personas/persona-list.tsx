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
      <div className="py-16 text-center">
        <p className="font-serif text-xl">No personas yet</p>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
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
