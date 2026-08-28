'use client'

import { useMemo, useState } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Plus } from 'lucide-react'
import type { AiStatus } from '@/types/persona'
import { emptyProfileContent } from '@/lib/profile'
import { Button } from '@/components/ui/button'
import { PageHeading } from '@/components/layout/app/page-heading'
import { AppPage } from '@/components/layout/app/app-page'
import { usePersonas } from '@/hooks/use-personas'
import { useAiStatus } from '@/hooks/use-ai-status'
import { useProfile } from '@/hooks/use-profile'
import { PersonaList } from './persona-list'
import { CreatePersonaSheet } from './create-persona-sheet'
import { EditPersonaSheet } from './edit-persona-sheet'

// Shown only in the gap before the (SSR-prefetched, hydrated) status lands —
// or if that read failed. AI off + the default cap is the safe assumption.
const STATUS_FALLBACK: AiStatus = { enabled: false, maxPersonas: 5 }

export function PersonasWorkspace() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const selectedId = searchParams.get('persona')

  const [createOpen, setCreateOpen] = useState(false)
  const { data: personas = [] } = usePersonas()
  const { data: status = STATUS_FALLBACK } = useAiStatus()
  const { data: profileData } = useProfile()
  // The sheets always need a shape to read from; a blank profile is the honest
  // stand-in while the real one is in flight. Memoised so they don't see a new
  // object identity on every render.
  const profile = useMemo(() => profileData ?? emptyProfileContent(), [profileData])
  // An id that isn't in the list — deleted, someone else's, or the list still
  // in flight — reads as no selection, so the sheet stays closed instead of
  // opening empty. It opens on its own if the list arrives holding that id.
  const editing = personas.find((p) => p.id === selectedId) ?? null
  const atCap = personas.length >= status.maxPersonas
  // Manual creation never needs AI — only the résumé-import mode does.
  const canCreate = !atCap

  const setParam = (next: URLSearchParams) => {
    const qs = next.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname)
  }
  const open = (id: string) => {
    const next = new URLSearchParams(searchParams)
    next.set('persona', id)
    setParam(next)
  }
  const close = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('persona')
    setParam(next)
  }

  return (
    <>
      <AppPage>
        <PageHeading
          title="Personas"
          description={
            <>
              <span className="font-mono tabular-nums">{`${personas.length} / ${status.maxPersonas}`}</span> role-focused backgrounds
            </>
          }
          actions={
            <Button type="button" disabled={!canCreate} onClick={() => setCreateOpen(true)} aria-label="New persona">
              <Plus className="size-4" aria-hidden="true" />
              <span className="hidden sm:inline">New persona</span>
            </Button>
          }
        />
        <div className="space-y-4">
          {/* Independent conditions: the cap disables the button, AI-off only gates the
              import mode — both messages must be able to show at once. */}
          {!status.enabled && (
            <p role="status" className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
              {process.env.NODE_ENV === 'development' ? (
                <>
                  AI features are not configured. Set <span className="font-mono">GEMINI_API_KEY</span> to import résumés.
                </>
              ) : (
                <>AI features are currently unavailable — résumé import is disabled.</>
              )}
            </p>
          )}
          {atCap && (
            <p role="status" className="text-xs text-muted-foreground">
              You&rsquo;ve reached the maximum of {status.maxPersonas} personas. Delete one to add another.
            </p>
          )}
          <PersonaList personas={personas} onEdit={(p) => open(p.id)} />
        </div>
      </AppPage>

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
          if (!o) close()
        }}
      />
    </>
  )
}
