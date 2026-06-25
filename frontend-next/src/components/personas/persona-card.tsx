'use client'

import Link from 'next/link'
import { Pencil, Trash2 } from 'lucide-react'
import type { Persona } from '@/types/persona'
import { useDeletePersona } from '@/hooks/use-personas'
import { useConfirm } from '@/hooks/use-confirm'

interface Props {
  persona: Persona
  onEdit: (persona: Persona) => void
}

export function PersonaCard({ persona, onEdit }: Props) {
  const del = useDeletePersona()
  const { confirm, confirmDialog } = useConfirm()

  const onDelete = async () => {
    if (
      await confirm({
        title: 'Delete persona?',
        description: `"${persona.name}" will be permanently deleted. Résumés and cover letters already generated from it are not affected.`,
        confirmLabel: 'Delete',
        destructive: true,
      })
    ) {
      del.mutate(persona.id)
    }
  }
  const roles = persona.data.experience.length
  const skills = persona.data.skills.length
  const summary = persona.data.summary.trim()

  return (
    <div className="flex flex-col rounded-lg border border-hairline p-4 transition-colors hover:border-border hover:bg-accent/40">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-medium">{persona.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            <span className="font-mono tabular-nums">{roles}</span> {roles === 1 ? 'role' : 'roles'} ·{' '}
            <span className="font-mono tabular-nums">{skills}</span> skill {skills === 1 ? 'group' : 'groups'}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <button
            type="button"
            aria-label={`Edit ${persona.name}`}
            onClick={() => onEdit(persona)}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <Pencil className="size-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label={`Delete ${persona.name}`}
            disabled={del.isPending}
            onClick={onDelete}
            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        </div>
      </div>
      {confirmDialog}

      <p className="mt-3 line-clamp-2 min-h-[2.5rem] text-sm text-muted-foreground">
        {summary || 'No summary yet — edit this persona to add one.'}
      </p>

      <Link
        href={`/app/resumes?persona=${persona.id}`}
        className="mt-3 inline-flex h-9 w-full items-center justify-center rounded-md border border-input bg-background text-sm font-medium transition-colors hover:bg-accent"
      >
        Generate résumé
      </Link>
    </div>
  )
}
