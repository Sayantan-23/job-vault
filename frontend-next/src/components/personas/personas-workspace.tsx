'use client'

import { useState } from 'react'
import type { Persona, AiStatus } from '@/types/persona'
import { Button } from '@/components/ui/button'
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
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl tracking-tight">Personas</h1>
          <p className="text-sm text-muted-foreground">
            <span className="font-mono">{`${personas.length} / ${status.maxPersonas}`}</span> role-focused backgrounds
          </p>
        </div>
        <Button type="button" disabled={!canCreate} onClick={() => setOpen(true)}>
          New persona
        </Button>
      </header>

      {!status.enabled ? (
        <p role="status" className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          AI features are not configured. Set <span className="font-mono">GEMINI_API_KEY</span> to create personas.
        </p>
      ) : null}

      <PersonaList personas={personas} />
      <CreatePersonaWizard open={open} onOpenChange={setOpen} />
    </div>
  )
}
