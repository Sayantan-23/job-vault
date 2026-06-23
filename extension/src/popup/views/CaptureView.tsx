import { useEffect, useState } from 'react'
import { Button } from '../ui/Button'
import { Input } from '../ui/Input'
import { Field } from '../ui/Field'
import { Badge } from '../ui/Badge'
import { Spinner } from '../ui/Spinner'
import { TopBar } from '../ui/TopBar'
import { ExternalLinkIcon } from '../ui/icons'
import { capturePage } from '../capture'
import { getSettings, getToken } from '@/lib/storage'
import { checkUrl, quickCreate, type JobSummary, type QuickCreateResult } from '@/lib/api'
import type { ExtractedJobData } from '@/lib/types'

interface Props {
  onSaved: (result: QuickCreateResult, serverUrl: string) => void
  onSettings: () => void
}

function sourceLabel(data: ExtractedJobData | null): string {
  if (!data) return 'this page'
  if (data.platform === 'linkedin') return 'LinkedIn'
  if (data.platform === 'indeed') return 'Indeed'
  try {
    return new URL(data.sourceUrl).hostname.replace(/^www\./, '')
  } catch {
    return 'this page'
  }
}

export function CaptureView({ onSaved, onSettings }: Props) {
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<ExtractedJobData | null>(null)
  const [title, setTitle] = useState('')
  const [company, setCompany] = useState('')
  const [location, setLocation] = useState('')
  const [duplicate, setDuplicate] = useState<JobSummary | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const { serverUrl } = await getSettings()
      const token = await getToken()
      if (!token) throw new Error('Not connected')
      const extracted = await capturePage(serverUrl, token)
      setData(extracted)
      setTitle(extracted.title)
      setCompany(extracted.company)
      setLocation(extracted.location ?? '')
      if (extracted.sourceUrl) {
        try {
          const check = await checkUrl(serverUrl, token, extracted.sourceUrl)
          if (check.isDuplicate && check.job) setDuplicate(check.job)
        } catch {
          /* dedup is best-effort */
        }
      }
    } catch {
      setError('Couldn’t read this page automatically. Fill in the details below.')
      setData({ title: '', company: '', sourceUrl: '', platform: 'generic', confidence: 'empty' })
    } finally {
      setLoading(false)
    }
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const { serverUrl } = await getSettings()
      const token = await getToken()
      if (!token) throw new Error('Not connected')
      const result = await quickCreate(serverUrl, token, {
        title: title.trim(),
        company: company.trim(),
        location: location.trim() || undefined,
        salaryRange: data?.salaryRange,
        sourceUrl: data?.sourceUrl || undefined,
        description: data?.description,
      })
      onSaved(result, serverUrl)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save')
    } finally {
      setSaving(false)
    }
  }

  function openDuplicate() {
    if (!duplicate) return
    void getSettings().then(({ serverUrl }) =>
      chrome.tabs.create({ url: `${serverUrl}/app/jobs?job=${duplicate.id}` }),
    )
  }

  const canSave = title.trim().length > 0 && company.trim().length > 0 && !saving

  return (
    <div>
      <TopBar onSettings={onSettings} />
      {loading ? (
        <div className="flex h-44 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
          <Spinner className="text-primary" />
          Reading this page…
        </div>
      ) : (
        <div className="space-y-4 p-5">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Captured from</span>
            <Badge>{sourceLabel(data)}</Badge>
          </div>

          {duplicate ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2 text-sm">
              <span className="text-muted-foreground">Already in your JobVault</span>
              <button
                onClick={openDuplicate}
                className="inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                Open <ExternalLinkIcon className="size-3.5" />
              </button>
            </div>
          ) : null}

          {error ? (
            <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <div className="space-y-3">
            <Field label="Title">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Job title" />
            </Field>
            <Field label="Company">
              <Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Company" />
            </Field>
            <Field label="Location">
              <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Optional" />
            </Field>
          </div>

          <Button onClick={save} disabled={!canSave} className="w-full">
            {saving ? (
              <>
                <Spinner /> Saving…
              </>
            ) : duplicate ? (
              'Save again'
            ) : (
              'Save to JobVault'
            )}
          </Button>
        </div>
      )}
    </div>
  )
}
