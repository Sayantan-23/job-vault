'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { fetchResumeTex } from '@/hooks/use-resumes'

export function ResumeOutputBar({ resumeId }: { resumeId: string }) {
  const [busy, setBusy] = useState<'copy' | 'overleaf' | null>(null)

  const copy = async () => {
    setBusy('copy')
    try {
      const { tex } = await fetchResumeTex(resumeId)
      await navigator.clipboard.writeText(tex)
    } finally {
      setBusy(null)
    }
  }

  const overleaf = async () => {
    setBusy('overleaf')
    try {
      const { tex } = await fetchResumeTex(resumeId)
      const form = document.createElement('form')
      form.method = 'POST'
      form.action = 'https://www.overleaf.com/docs'
      form.target = '_blank'
      const field = document.createElement('input')
      field.type = 'hidden'
      field.name = 'snip'
      field.value = tex
      form.appendChild(field)
      document.body.appendChild(form)
      form.submit()
      form.remove()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={copy}>
        {busy === 'copy' ? 'Copying…' : 'Copy LaTeX'}
      </Button>
      <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={overleaf}>
        {busy === 'overleaf' ? 'Opening…' : 'Open in Overleaf'}
      </Button>
    </div>
  )
}
