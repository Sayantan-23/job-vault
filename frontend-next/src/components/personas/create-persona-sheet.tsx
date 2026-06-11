// frontend-next/src/components/personas/create-persona-sheet.tsx
'use client'

import { useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { PersonaModeCard } from './persona-mode-card'
import { PdfFileInput } from './pdf-file-input'
import { PersonaContentEditor } from './persona-content-editor'
import { useCreatePersona, useParseResume } from '@/hooks/use-personas'
import { emptyProfileContent, validateProfileContent } from '@/lib/profile'
import type { ProfileContent } from '@/types/profile'

// Persona creation in two modes, both ending at the same review-and-save
// editor: "Build from profile" seeds basics + summary from the master profile
// (sections are then picked/tailored), "Import a résumé" sends pasted text
// and/or a PDF to the AI parse endpoint and pre-fills the editor from the
// structured result (the extracted text is kept as rawInput for audit).
type Step = 'mode' | 'import' | 'edit'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  profile: ProfileContent
  aiEnabled: boolean
}

export function CreatePersonaSheet({ open, onOpenChange, profile, aiEnabled }: Props) {
  const [step, setStep] = useState<Step>('mode')
  const [name, setName] = useState('')
  const [draft, setDraft] = useState<ProfileContent | null>(null)
  const [rawText, setRawText] = useState<string | null>(null)
  const [pasted, setPasted] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [errors, setErrors] = useState<string[]>([])
  const parse = useParseResume()
  const create = useCreatePersona()

  const reset = () => {
    setStep('mode')
    setName('')
    setDraft(null)
    setRawText(null)
    setPasted('')
    setFile(null)
    setErrors([])
    parse.reset()
    create.reset()
  }

  const handleOpenChange = (next: boolean) => {
    onOpenChange(next)
    if (!next) reset()
  }

  const startBuild = () => {
    setDraft({
      ...emptyProfileContent(),
      basics: structuredClone(profile.basics),
      summary: profile.summary,
    })
    setStep('edit')
  }

  const runParse = () => {
    parse.mutate(
      { text: pasted.trim() || undefined, file: file ?? undefined },
      {
        onSuccess: ({ content, rawText: extracted }) => {
          setDraft(content)
          setRawText(extracted)
          setStep('edit')
        },
      },
    )
  }

  const save = () => {
    if (!draft || !name.trim()) return
    const found = validateProfileContent(draft)
    setErrors(found)
    if (found.length > 0) return
    create.mutate(
      { name: name.trim(), data: draft, rawInput: rawText ?? null },
      { onSuccess: () => handleOpenChange(false) },
    )
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent hideClose>
        <div className="sticky top-0 z-10 flex items-center justify-between gap-2 border-b border-border bg-card px-6 py-4">
          <SheetTitle className="text-lg font-semibold">New persona</SheetTitle>
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            {step === 'edit' ? (
              <Button
                type="button"
                size="sm"
                onClick={save}
                disabled={create.isPending || !name.trim() || !draft}
              >
                {create.isPending ? 'Saving…' : 'Save'}
              </Button>
            ) : null}
          </div>
        </div>

        {step === 'mode' ? (
          <div className="space-y-6 p-6">
            <PersonaNameField value={name} onChange={setName} />
            <div className="grid gap-3 sm:grid-cols-2">
              <PersonaModeCard
                title="Build from profile"
                subtitle="Pick from your master profile and tailor"
                onSelect={startBuild}
              />
              <PersonaModeCard
                title="Import a résumé"
                subtitle="Paste text or upload a PDF — AI fills it in"
                disabled={!aiEnabled}
                disabledHint="AI features are not configured."
                onSelect={() => setStep('import')}
              />
            </div>
          </div>
        ) : null}

        {step === 'import' ? (
          <div className="space-y-6 p-6">
            <Button type="button" variant="ghost" size="sm" onClick={() => setStep('mode')}>
              <ArrowLeft className="size-4" aria-hidden="true" />
              Back
            </Button>
            {parse.error ? <SheetErrorMessage message={parse.error.message} /> : null}
            <div className="space-y-1.5">
              <Label htmlFor="import-resume-text">Paste your résumé</Label>
              <Textarea
                id="import-resume-text"
                rows={10}
                placeholder="Paste the full text of an existing résumé…"
                value={pasted}
                onChange={(e) => setPasted(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Or upload a PDF</Label>
              <PdfFileInput file={file} onChange={setFile} />
            </div>
            <Button
              type="button"
              onClick={runParse}
              disabled={parse.isPending || (!pasted.trim() && !file)}
            >
              {parse.isPending ? 'Parsing…' : 'Parse with AI'}
            </Button>
          </div>
        ) : null}

        {step === 'edit' ? (
          <div className="space-y-6 p-6">
            {errors.length > 0 ? <SheetValidationErrors errors={errors} /> : null}
            {create.error ? <SheetErrorMessage message={create.error.message} /> : null}
            <PersonaNameField value={name} onChange={setName} />
            {draft ? <PersonaContentEditor value={draft} onChange={setDraft} profile={profile} /> : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}

function PersonaNameField({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="create-persona-name">Persona name</Label>
      <Input
        id="create-persona-name"
        placeholder="e.g. Backend"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  )
}

function SheetErrorMessage({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  )
}

function SheetValidationErrors({ errors }: { errors: string[] }) {
  return (
    <div role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
      <p className="font-medium">Please fix the following:</p>
      <ul className="mt-1 list-inside list-disc">
        {errors.map((e) => (
          <li key={e}>{e}</li>
        ))}
      </ul>
    </div>
  )
}
