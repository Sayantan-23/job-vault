'use client'

import { useEffect, useState } from 'react'
import type { Persona } from '@/types/persona'
import type { ProfileContent } from '@/types/profile'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { PersonaContentEditor } from './persona-content-editor'
import { SheetErrorMessage, SheetValidationErrors } from './persona-sheet-alerts'
import { useUpdatePersona } from '@/hooks/use-personas'
import { validateProfileContent } from '@/lib/profile'

interface Props {
  persona: Persona | null
  profile: ProfileContent
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditPersonaSheet({ persona, profile, open, onOpenChange }: Props) {
  const [name, setName] = useState('')
  const [data, setData] = useState<ProfileContent | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const update = useUpdatePersona(persona?.id ?? '')

  // Re-seed the form whenever a different persona is opened for editing.
  useEffect(() => {
    if (persona) {
      setName(persona.name)
      setData(persona.data)
      setErrors([])
    }
  }, [persona])

  const save = () => {
    if (!data || !name.trim()) return
    const found = validateProfileContent(data)
    setErrors(found)
    if (found.length > 0) return
    update.mutate({ name: name.trim(), data }, { onSuccess: () => onOpenChange(false) })
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent hideClose>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-card px-6 py-4">
          <SheetTitle className="text-lg font-semibold">Edit persona</SheetTitle>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="button" size="sm" onClick={save} disabled={update.isPending || !name.trim() || !data}>
              {update.isPending ? 'Saving…' : 'Save'}
            </Button>
          </div>
        </div>

        <div className="space-y-6 p-6">
          {errors.length > 0 ? <SheetValidationErrors errors={errors} /> : null}
          {update.error ? <SheetErrorMessage message={update.error.message} /> : null}
          <div className="space-y-1.5">
            <Label htmlFor="edit-persona-name">Persona name</Label>
            <Input id="edit-persona-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {data ? <PersonaContentEditor value={data} onChange={setData} profile={profile} /> : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
