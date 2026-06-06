'use client'

import Link from 'next/link'
import type { Persona } from '@/types/persona'
import { Button } from '@/components/ui/button'
import { useDeletePersona } from '@/hooks/use-personas'

export function PersonaList({ personas }: { personas: Persona[] }) {
  const del = useDeletePersona()

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
    <ul className="divide-y divide-border border-y border-border">
      {personas.map((p) => {
        const roles = p.data.experience.length
        const skills = p.data.skills.length
        return (
          <li key={p.id} className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{p.name}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                <span className="font-mono tabular-nums">{roles}</span> {roles === 1 ? 'role' : 'roles'} ·{' '}
                <span className="font-mono tabular-nums">{skills}</span> skill {skills === 1 ? 'group' : 'groups'}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-1.5">
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
        )
      })}
    </ul>
  )
}
