'use client'

import { useState } from 'react'
import { useScrapeJob, useCreateJob } from '@/hooks/use-jobs'
import type { ScrapeResult } from '@/types/job'
import type { ManualJobValues } from '@/schemas/job'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function UrlPasteForm({
  onScraped,
  onCreated,
}: {
  onScraped: (prefill: Partial<ManualJobValues>) => void
  onCreated: () => void
}) {
  const [url, setUrl] = useState('')
  const [preview, setPreview] = useState<ScrapeResult | null>(null)
  const scrape = useScrapeJob()
  const create = useCreateJob()

  const onFetch = () => {
    setPreview(null)
    scrape.mutate(url, { onSuccess: (result) => setPreview(result) })
  }

  const onSave = () => {
    if (!preview) return
    const payload: ManualJobValues = {
      title: preview.title,
      company: preview.company,
      snapshotMarkdown: preview.snapshotMarkdown,
      sourceUrl: url,
    }
    if (preview.location) payload.location = preview.location
    if (preview.salaryRange) payload.salaryRange = preview.salaryRange
    create.mutate(payload, { onSuccess: onCreated })
  }

  const toManual = () => {
    const prefill: Partial<ManualJobValues> = { sourceUrl: url }
    if (preview) {
      prefill.title = preview.title
      prefill.company = preview.company
      prefill.snapshotMarkdown = preview.snapshotMarkdown
      if (preview.location) prefill.location = preview.location
      if (preview.salaryRange) prefill.salaryRange = preview.salaryRange
    }
    onScraped(prefill)
  }

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="job-url">Job posting URL</Label>
        <div className="flex gap-2">
          <Input
            id="job-url"
            type="url"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Button type="button" onClick={onFetch} disabled={!url || scrape.isPending}>
            {scrape.isPending ? 'Fetching…' : 'Fetch'}
          </Button>
        </div>
      </div>

      {scrape.isError ? (
        <div className="space-y-2 rounded-lg bg-destructive/10 px-3 py-2.5">
          <p className="text-sm text-destructive">
            Could not capture this posting. You can enter the details manually instead.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={toManual}>
            Enter details manually
          </Button>
        </div>
      ) : null}

      {preview ? (
        <div className="space-y-3 rounded-lg border border-border p-4">
          <div className="space-y-0.5">
            <p className="font-medium">{preview.title}</p>
            <p className="text-sm text-muted-foreground">{preview.company}</p>
            {preview.location ? <p className="text-sm text-muted-foreground">{preview.location}</p> : null}
            {preview.salaryRange ? (
              <p className="font-mono text-xs text-muted-foreground">{preview.salaryRange}</p>
            ) : null}
          </div>
          <div className="flex gap-2">
            <Button type="button" onClick={onSave} disabled={create.isPending}>
              {create.isPending ? 'Saving…' : 'Save job'}
            </Button>
            <Button type="button" variant="outline" onClick={toManual}>
              Edit details
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
