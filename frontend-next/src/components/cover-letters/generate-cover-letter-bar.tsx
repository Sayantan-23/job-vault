'use client'

import { useState } from 'react'
import { Briefcase, ClipboardList } from 'lucide-react'
import type { Persona } from '@/types/persona'
import type { JobOption } from '@/hooks/use-job-options'
import type { GenerateBody } from '@/hooks/use-cover-letters'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { SegmentedControl, type SegmentedOption } from '@/components/ui/segmented-control'

type JobSource = 'tracked' | 'paste'

const JOB_SOURCE_OPTIONS: ReadonlyArray<SegmentedOption<JobSource>> = [
  { value: 'tracked', label: 'Tracked job', icon: Briefcase },
  { value: 'paste', label: 'Paste a description', icon: ClipboardList },
]

interface Props {
  personas: Persona[]
  jobs: JobOption[]
  isPending: boolean
  onGenerate: (body: GenerateBody) => void
  // Pre-selects a tracked job (e.g. opened from a JobDrawer via ?job). The bar
  // remounts each time the sheet opens, so this is read fresh on every open.
  initialJobId?: string | undefined
}

// Shown instead of leaving the empty picker a dead end. We deliberately do
// not auto-switch modes — the jobs load async and the swap would flicker.
function NoTrackedJobsHint() {
  return (
    <p className="text-xs text-muted-foreground">
      No tracked jobs yet — switch to &quot;Paste a description&quot;.
    </p>
  )
}

function TrackedJobFields({
  jobs,
  jobId,
  onJobChange,
}: {
  jobs: JobOption[]
  jobId: string
  onJobChange: (id: string) => void
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor="gcl-job">Job</Label>
      <Select id="gcl-job" value={jobId} onChange={(e) => onJobChange(e.target.value)}>
        <option value="">Select a job…</option>
        {jobs.map((j) => (
          <option key={j.id} value={j.id}>
            {j.title} — {j.company}
          </option>
        ))}
      </Select>
      {jobs.length === 0 ? <NoTrackedJobsHint /> : null}
    </div>
  )
}

function PasteJobFields({
  title,
  onTitleChange,
  company,
  onCompanyChange,
  description,
  onDescriptionChange,
}: {
  title: string
  onTitleChange: (value: string) => void
  company: string
  onCompanyChange: (value: string) => void
  description: string
  onDescriptionChange: (value: string) => void
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="space-y-1.5 sm:flex-1">
          <Label htmlFor="gcl-title">Job title</Label>
          <Input
            id="gcl-title"
            placeholder="e.g. Staff Engineer"
            maxLength={255}
            value={title}
            onChange={(e) => onTitleChange(e.target.value)}
          />
        </div>
        <div className="space-y-1.5 sm:flex-1">
          <Label htmlFor="gcl-company">Company</Label>
          <Input
            id="gcl-company"
            placeholder="e.g. Acme"
            maxLength={255}
            value={company}
            onChange={(e) => onCompanyChange(e.target.value)}
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="gcl-description">Job description</Label>
        <Textarea
          id="gcl-description"
          rows={5}
          placeholder="Paste the job description (optional, but it makes the letter much better)"
          maxLength={50_000}
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
        />
      </div>
    </div>
  )
}

export function GenerateCoverLetterBar({ personas, jobs, isPending, onGenerate, initialJobId }: Props) {
  const [personaId, setPersonaId] = useState(personas[0]?.id ?? '')
  const [mode, setMode] = useState<JobSource>('tracked')
  const [jobId, setJobId] = useState(initialJobId ?? '')
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [description, setDescription] = useState('')
  const [instructions, setInstructions] = useState('')

  // In tracked mode require the id to be a real loaded option, not just non-empty
  // — a stale/foreign ?job= deep-link seeds a blank-looking select that would
  // otherwise leave Generate clickable (and 404 on submit).
  const trackedJobValid = jobs.some((j) => j.id === jobId)
  const disabled =
    isPending || !personaId || (mode === 'tracked' ? !trackedJobValid : !title.trim() || !company.trim())

  const handleGenerate = () => {
    const trimmedInstructions = instructions.trim()
    const base = trimmedInstructions ? { instructions: trimmedInstructions } : {}
    if (mode === 'tracked') {
      onGenerate({ personaId, jobId, ...base })
      return
    }
    const trimmedDescription = description.trim()
    onGenerate({
      personaId,
      job: {
        title: title.trim(),
        company: company.trim(),
        ...(trimmedDescription ? { description: trimmedDescription } : {}),
      },
      ...base,
    })
  }

  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="space-y-1.5 sm:w-52">
          <Label htmlFor="gcl-persona">Persona</Label>
          <Select id="gcl-persona" value={personaId} onChange={(e) => setPersonaId(e.target.value)}>
            {personas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="hidden flex-1 sm:block" />
        <SegmentedControl aria-label="Job source" value={mode} onValueChange={setMode} options={JOB_SOURCE_OPTIONS} />
      </div>
      {mode === 'tracked' ? (
        <TrackedJobFields jobs={jobs} jobId={jobId} onJobChange={setJobId} />
      ) : (
        <PasteJobFields
          title={title}
          onTitleChange={setTitle}
          company={company}
          onCompanyChange={setCompany}
          description={description}
          onDescriptionChange={setDescription}
        />
      )}
      <div className="space-y-1.5">
        <Label htmlFor="gcl-instructions">Instructions (optional)</Label>
        <Textarea
          id="gcl-instructions"
          rows={2}
          placeholder="e.g. mention my open-source work; keep it under a page"
          maxLength={2000}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
        />
      </div>
      <div className="flex justify-end">
        <Button type="button" disabled={disabled} onClick={handleGenerate}>
          {isPending ? 'Generating…' : 'Generate cover letter'}
        </Button>
      </div>
    </div>
  )
}
