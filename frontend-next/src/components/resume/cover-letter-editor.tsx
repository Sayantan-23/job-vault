'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { DownloadCoverLetterPdfButton } from './download-cover-letter-pdf-button'

interface Props {
  value: string
  onChange: (next: string) => void
  fileName: string
}

export function CoverLetterEditor({ value, onChange, fileName }: Props) {
  const [showPreview, setShowPreview] = useState(false)
  const copy = () => void navigator.clipboard.writeText(value)
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={copy}>Copy text</Button>
        <DownloadCoverLetterPdfButton body={value} fileName={fileName} />
        <Button type="button" variant="ghost" size="sm" onClick={() => setShowPreview((v) => !v)}>
          {showPreview ? 'Edit' : 'Preview'}
        </Button>
      </div>
      {showPreview ? (
        <div className="prose prose-sm max-w-none rounded-lg border border-border p-3 text-sm">
          <ReactMarkdown>{value}</ReactMarkdown>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="cl-body" className="sr-only">Cover letter body</Label>
          <Textarea id="cl-body" rows={14} value={value} onChange={(e) => onChange(e.target.value)} />
        </div>
      )}
    </div>
  )
}
