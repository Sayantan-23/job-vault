'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { Persona } from '@/types/persona'
import type { ProfileContent } from '@/types/profile'
import { Sheet, SheetContent, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { PersonaContentEditor } from './persona-content-editor'
import { SheetErrorMessage, SheetValidationErrors } from './persona-sheet-alerts'
import { useUpdatePersona } from '@/hooks/use-personas'
import { validateProfileContent, reconcilePersonaWithProfile, emptyProfileContent } from '@/lib/profile'

interface Props {
  persona: Persona | null
  profile: ProfileContent
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditPersonaSheet({ persona, profile, open, onOpenChange }: Props) {
  const [name, setName] = useState('')
  const [data, setData] = useState<ProfileContent | null>(null)
  const [initialName, setInitialName] = useState('')
  const [initialData, setInitialData] = useState<ProfileContent | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const update = useUpdatePersona(persona?.id ?? '')

  // Re-seed the form whenever a different persona is opened for editing.
  // Adjusting state during render (React's documented pattern for syncing to
  // changed input) keeps the draft from ever committing a frame that mixes the
  // new persona with the previous one's name/data.
  const [seeded, setSeeded] = useState<Persona | null>(null)
  if (persona && persona !== seeded) {
    setSeeded(persona)
    setName(persona.name)
    setInitialName(persona.name)
    const reconciled = reconcilePersonaWithProfile(persona.data ?? emptyProfileContent(), profile)
    setData(reconciled)
    setInitialData(reconciled)
    setErrors([])
    setShowExitConfirm(false)
  }

  if (!persona && seeded !== null) {
    setSeeded(null)
    setName('')
    setInitialName('')
    setData(null)
    setInitialData(null)
    setErrors([])
    setShowExitConfirm(false)
  }

  // resetUpdate clears a stale failure banner from a previous persona's save
  // (the sheet stays mounted across opens). It touches the mutation, not this
  // component's state, so it stays in an effect; it is referentially stable in
  // TanStack v5, so listing it as a dep adds no extra runs.
  const { reset: resetUpdate } = update
  useEffect(() => {
    if (persona) resetUpdate()
  }, [persona, resetUpdate])

  const dirty =
    persona !== null &&
    initialData !== null &&
    (name !== initialName || JSON.stringify(data) !== JSON.stringify(initialData))

  const requestClose = () => {
    if (dirty) {
      setShowExitConfirm(true)
    } else {
      onOpenChange(false)
    }
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      requestClose()
    } else {
      onOpenChange(true)
    }
  }

  const handlePointerDownOutside = (e: { preventDefault: () => void }) => {
    if (dirty) {
      e.preventDefault()
      setShowExitConfirm(true)
    }
  }

  const handleEscapeKeyDown = (e: { preventDefault: () => void }) => {
    if (dirty) {
      e.preventDefault()
      setShowExitConfirm(true)
    }
  }

  const handleDiscard = () => {
    setShowExitConfirm(false)
    onOpenChange(false)
  }

  const save = () => {
    if (!data || !name.trim()) return
    // Education is pick-only here; imported/legacy entries may legitimately lack dates.
    const found = validateProfileContent(data, { requireEducationDates: false })
    setErrors(found)
    if (found.length > 0) return
    update.mutate({ name: name.trim(), data }, { onSuccess: () => onOpenChange(false) })
  }

  return (
    <>
      <Sheet open={open} onOpenChange={handleOpenChange}>
        <SheetContent
          hideClose
          onEscapeKeyDown={handleEscapeKeyDown}
          onPointerDownOutside={handlePointerDownOutside}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-card px-6 py-4">
            <SheetTitle className="text-lg font-semibold">Edit persona</SheetTitle>
            <SheetDescription className="sr-only">Edit your tailored persona details and content.</SheetDescription>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={requestClose}
              aria-label="Close"
              className="-mr-1 size-8 shrink-0 text-muted-foreground"
            >
              <X className="size-4" />
            </Button>
          </div>

          <div className="flex-1 space-y-6 p-6">
            {errors.length > 0 ? <SheetValidationErrors errors={errors} /> : null}
            {update.error ? <SheetErrorMessage message={update.error.message} /> : null}
            <div className="space-y-1.5">
              <Label htmlFor="edit-persona-name">Persona name</Label>
              <Input id="edit-persona-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            {data ? <PersonaContentEditor value={data} onChange={setData} profile={profile} /> : null}
          </div>

          <footer className="sticky bottom-0 z-10 mt-auto flex items-center justify-end gap-2 border-t border-border bg-card px-6 py-4">
            <Button type="button" variant="ghost" size="sm" onClick={requestClose}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={save}
              disabled={update.isPending || !name.trim() || !data}
            >
              {update.isPending ? 'Saving…' : 'Save'}
            </Button>
          </footer>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={showExitConfirm}
        onOpenChange={setShowExitConfirm}
        title="Discard unsaved changes?"
        description="You have unsaved edits in this persona that will be lost."
        confirmLabel="Discard"
        destructive
        onConfirm={handleDiscard}
      />
    </>
  )
}
