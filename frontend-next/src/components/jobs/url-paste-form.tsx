'use client'

import { useState } from 'react'
import { useScrapeJob, useCreateJob } from '@/hooks/use-jobs'
import type { ScrapeResult } from '@/types/job'
import type { ManualJobValues } from '@/schemas/job'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

// Mirrors the backend's placeholder defaults — values we should never prefill or
// persist as if they were real.
const PLACEHOLDER_TITLE = 'Untitled Position'
const PLACEHOLDER_COMPANY = 'Unknown Company'

const realValue = (value: string | undefined, placeholder: string): string =>
  value && value !== placeholder ? value : ''

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

  // Build a manual-form prefill from a scrape result, dropping placeholder
  // title/company so the user gets empty fields to fill rather than junk.
  const buildPrefill = (result: ScrapeResult): Partial<ManualJobValues> => {
    const prefill: Partial<ManualJobValues> = { sourceUrl: url }
    const title = realValue(result.title, PLACEHOLDER_TITLE)
    const company = realValue(result.company, PLACEHOLDER_COMPANY)
    if (title) prefill.title = title
    if (company) prefill.company = company
    if (result.snapshotMarkdown) prefill.snapshotMarkdown = result.snapshotMarkdown
    if (result.location) prefill.location = result.location
    if (result.salaryRange) prefill.salaryRange = result.salaryRange
    return prefill
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
    onScraped(preview ? buildPrefill(preview) : { sourceUrl: url })
  }

  // Older API responses omit `status`; treat them as a clean capture.
  const status = preview ? (preview.status ?? 'ok') : null
  const captured = status === 'ok'
  const incomplete = status === 'partial' || status === 'empty'

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
            {scrape.isPending ? 'Capturing…' : 'Fetch'}
          </Button>
        </div>
        {scrape.isPending ? (
          <p role="status" className="text-xs text-muted-foreground">
            Capturing the posting — this can take a few seconds for some sites.
          </p>
        ) : null}
      </div>

      {scrape.isError ? (
        <div role="status" className="space-y-2 rounded-lg bg-destructive/10 px-3 py-2.5">
          <p className="text-sm text-destructive">
            Could not capture this posting. You can enter the details manually instead.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={toManual}>
            Enter details manually
          </Button>
        </div>
      ) : null}

      {captured && preview ? (
        <div role="status" className="space-y-3 rounded-lg border border-border p-4">
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

      {incomplete ? (
        <div role="status" className="space-y-2 rounded-lg border border-border bg-muted/40 px-3 py-2.5">
          <p className="text-sm font-medium text-foreground">We couldn&apos;t fully capture this posting</p>
          <p className="text-sm text-muted-foreground">
            Some sites block automatic capture. We&apos;ve filled in what we could — review and complete the
            details.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={toManual}>
            Review &amp; complete details
          </Button>
        </div>
      ) : null}
    </div>
  )
}
