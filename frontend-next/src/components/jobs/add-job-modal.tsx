'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { UrlPasteForm } from './url-paste-form'
import { ManualJobForm } from './manual-job-form'
import type { ManualJobValues } from '@/schemas/job'
import { cn } from '@/lib/utils'

type Tab = 'url' | 'manual'

export function AddJobModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const [tab, setTab] = useState<Tab>('url')
  const [prefill, setPrefill] = useState<Partial<ManualJobValues> | undefined>(undefined)

  const close = () => {
    onOpenChange(false)
    // Reset for the next open.
    setTab('url')
    setPrefill(undefined)
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? onOpenChange(true) : close())}>
      <DialogContent>
        <DialogTitle className="text-lg font-semibold">Add a job</DialogTitle>
        <DialogDescription className="text-sm text-muted-foreground">
          Paste a job URL to auto-capture it, or enter the details by hand.
        </DialogDescription>

        <div role="tablist" aria-label="Add job method" className="flex gap-1 rounded-lg bg-muted p-1">
          {(['url', 'manual'] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={tab === t}
              onClick={() => setTab(t)}
              className={cn(
                'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                tab === t ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground',
              )}
            >
              {t === 'url' ? 'From URL' : 'Manual'}
            </button>
          ))}
        </div>

        {tab === 'url' ? (
          <UrlPasteForm
            onCreated={close}
            onScraped={(data) => {
              setPrefill(data)
              setTab('manual')
            }}
          />
        ) : (
          <ManualJobForm onCreated={close} {...(prefill ? { prefill } : {})} />
        )}
      </DialogContent>
    </Dialog>
  )
}
