'use client'

import { useState } from 'react'
import { Plus } from 'lucide-react'
import type { Persona, AiStatus } from '@/types/persona'
import type { ProfileContent } from '@/types/profile'
import { Button } from '@/components/ui/button'
import { PageHeader } from '@/components/layout/app/page-header'
import { usePersonas } from '@/hooks/use-personas'
import { useAiStatus } from '@/hooks/use-ai-status'
import { useProfile } from '@/hooks/use-profile'
import { PersonaList } from './persona-list'
import { CreatePersonaSheet } from './create-persona-sheet'
import { EditPersonaSheet } from './edit-persona-sheet'

interface Props {
  initialPersonas: Persona[]
  initialStatus: AiStatus
  initialProfile: ProfileContent
}

export function PersonasWorkspace({ initialPersonas, initialStatus, initialProfile }: Props) {
  const [createOpen, setCreateOpen] = useState(false)
  const [editing, setEditing] = useState<Persona | null>(null)
  const { data: personas = initialPersonas } = usePersonas(initialPersonas)
  const { data: status = initialStatus } = useAiStatus(initialStatus)
  const { data: profile = initialProfile } = useProfile(initialProfile)
  const atCap = personas.length >= status.maxPersonas
  // Manual creation never needs AI — only the résumé-import mode does.
  const canCreate = !atCap

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
          <Button type="button" disabled={!canCreate} onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden="true" />
            New persona
          </Button>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="space-y-4">
          {/* Independent conditions: the cap disables the button, AI-off only gates the
              import mode — both messages must be able to show at once. */}
          {!status.enabled && (
            <p role="status" className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              AI features are not configured. Set <span className="font-mono">GEMINI_API_KEY</span> to import résumés.
            </p>
          )}
          {atCap && (
            <p role="status" className="text-xs text-muted-foreground">
              You&rsquo;ve reached the maximum of {status.maxPersonas} personas. Delete one to add another.
            </p>
          )}
          <PersonaList personas={personas} onEdit={setEditing} />
        </div>
      </div>

      <CreatePersonaSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        profile={profile}
        aiEnabled={status.enabled}
      />
      <EditPersonaSheet
        persona={editing}
        profile={profile}
        open={editing !== null}
        onOpenChange={(o) => {
          if (!o) setEditing(null)
        }}
      />
    </div>
  )
}
