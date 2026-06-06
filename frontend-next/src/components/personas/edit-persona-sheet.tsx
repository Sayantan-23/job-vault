'use client'

import { useEffect, useState } from 'react'
import type { Persona } from '@/types/persona'
import type { ResumeContent } from '@/types/resume'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { ResumeContentEditor } from '@/components/resume/resume-content-editor'
import { useUpdatePersona } from '@/hooks/use-personas'

interface Props {
  persona: Persona | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditPersonaSheet({ persona, open, onOpenChange }: Props) {
  const [name, setName] = useState('')
  const [data, setData] = useState<ResumeContent | null>(null)
  const update = useUpdatePersona(persona?.id ?? '')

  // Re-seed the form whenever a different persona is opened for editing.
  useEffect(() => {
    if (persona) {
      setName(persona.name)
      setData(persona.data)
    }
  }, [persona])

  const save = () => {
    if (!data || !name.trim()) return
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
          {update.error ? (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {update.error.message}
            </p>
          ) : null}
          <div className="space-y-1.5">
            <Label htmlFor="edit-persona-name">Persona name</Label>
            <Input id="edit-persona-name" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          {data ? <ResumeContentEditor value={data} onChange={setData} /> : null}
        </div>
      </SheetContent>
    </Sheet>
  )
}
