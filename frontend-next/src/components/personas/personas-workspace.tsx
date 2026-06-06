'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Persona, AiStatus } from '@/types/persona'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/app/page-header'
import { usePersonas } from '@/hooks/use-personas'
import { useAiStatus } from '@/hooks/use-ai-status'
import { PersonaList } from './persona-list'
import { CreatePersonaWizard } from './create-persona-wizard'

interface Props {
  initialPersonas: Persona[]
  initialStatus: AiStatus
}

export function PersonasWorkspace({ initialPersonas, initialStatus }: Props) {
  const [open, setOpen] = useState(false)
  const { data: personas = initialPersonas } = usePersonas(initialPersonas)
  const { data: status = initialStatus } = useAiStatus(initialStatus)
  const atCap = personas.length >= status.maxPersonas
  const canCreate = status.enabled && !atCap

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PageHeader
        title="Personas"
        description={
          <>
            <span className="font-mono tabular-nums">{`${personas.length} / ${status.maxPersonas}`}</span> role-focused backgrounds
          </>
        }
        actions={
          <Button type="button" disabled={!canCreate} onClick={() => setOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            New persona
          </Button>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="max-w-3xl space-y-4">
          {!status.enabled ? (
            <p role="status" className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              AI features are not configured. Set <span className="font-mono">GEMINI_API_KEY</span> to create personas.
            </p>
          ) : atCap ? (
            <p role="status" className="text-xs text-muted-foreground">
              You&rsquo;ve reached the maximum of {status.maxPersonas} personas. Delete one to add another.
            </p>
          ) : null}
          <PersonaList personas={personas} />
        </div>
      </div>
      <CreatePersonaWizard open={open} onOpenChange={setOpen} />
    </div>
  )
}
