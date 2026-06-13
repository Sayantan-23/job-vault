'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Pencil, Eye } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { coverLetterToPlainText } from '@/lib/cover-letter-markdown'
import { CoverLetterPreview } from './cover-letter-preview'
import { DownloadCoverLetterPdfButton } from './download-cover-letter-pdf-button'

interface Props {
  value: string
  onChange: (next: string) => void
  fileName: string
}

type Mode = 'edit' | 'preview'

export function CoverLetterEditor({ value, onChange, fileName }: Props) {
  const [mode, setMode] = useState<Mode>('edit')
  const [copied, setCopied] = useState(false)
  const copiedTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => clearTimeout(copiedTimer.current), [])

  const copy = () => {
    void navigator.clipboard.writeText(coverLetterToPlainText(value))
    setCopied(true)
    clearTimeout(copiedTimer.current)
    copiedTimer.current = setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <SegmentedControl
          value={mode}
          onValueChange={setMode}
          aria-label="Cover letter view mode"
          options={[
            { value: 'edit', label: 'Edit', icon: Pencil },
            { value: 'preview', label: 'Preview', icon: Eye },
          ]}
        />
        <div className="hidden flex-1 sm:block" />
        <Button type="button" variant="outline" size="sm" onClick={copy} aria-live="polite">
          {copied ? <Check className="size-3.5" aria-hidden="true" /> : <Copy className="size-3.5" aria-hidden="true" />}
          {copied ? 'Copied' : 'Copy text'}
        </Button>
        <DownloadCoverLetterPdfButton body={value} fileName={fileName} />
      </div>
      {mode === 'preview' ? (
        <CoverLetterPreview body={value} />
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="cl-body" className="sr-only">Cover letter body</Label>
          <Textarea id="cl-body" rows={14} value={value} onChange={(e) => onChange(e.target.value)} />
        </div>
      )}
    </div>
  )
}
