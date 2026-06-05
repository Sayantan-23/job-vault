'use client'

import Link from 'next/link'
import type { Persona } from '@/types/persona'
import { Button } from '@/components/ui/button'
import { useDeletePersona } from '@/hooks/use-personas'

export function PersonaList({ personas }: { personas: Persona[] }) {
  const del = useDeletePersona()
  if (personas.length === 0) {
    return <p className="text-sm text-muted-foreground">No personas yet. Create one to start generating tailored résumés and cover letters.</p>
  }
  return (
    <ul className="divide-y divide-border">
      {personas.map((p) => (
        <li key={p.id} className="flex items-center justify-between py-3">
          <div>
            <p className="font-medium">{p.name}</p>
            <p className="text-xs text-muted-foreground">
              {p.data.experience.length} roles · {p.data.skills.length} skill groups
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/app/resumes?persona=${p.id}`}
              className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
            >
              Generate résumé
            </Link>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              aria-label={`Delete ${p.name}`}
              disabled={del.isPending}
              onClick={() => del.mutate(p.id)}
            >
              Delete
            </Button>
          </div>
        </li>
      ))}
    </ul>
  )
}
