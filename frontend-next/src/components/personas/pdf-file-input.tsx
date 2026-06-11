// frontend-next/src/components/personas/pdf-file-input.tsx
'use client'

import { useRef } from 'react'
import { Upload, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

// PDF picker for the import step: a visually-hidden file input behind an
// outline button that shows the chosen file name, plus a clear action.
interface Props {
  file: File | null
  onChange: (file: File | null) => void
}

export function PdfFileInput({ file, onChange }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div className="flex items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        aria-label="Résumé PDF"
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      <Button type="button" variant="outline" size="sm" onClick={() => inputRef.current?.click()}>
        <Upload className="size-4" aria-hidden="true" />
        <span className="max-w-56 truncate">{file ? file.name : 'Upload a PDF'}</span>
      </Button>
      {file ? (
        <Button
          type="button"
          variant="ghost"
          size="iconSm"
          aria-label="Clear PDF"
          onClick={() => {
            if (inputRef.current) inputRef.current.value = ''
            onChange(null)
          }}
        >
          <X className="size-4" aria-hidden="true" />
        </Button>
      ) : null}
    </div>
  )
}
