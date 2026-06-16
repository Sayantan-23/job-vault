'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Copy, Pencil, Eye, Undo2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { SegmentedControl } from '@/components/ui/segmented-control'
import { MutationErrorAlert } from '@/components/documents/mutation-error-alert'
import { coverLetterToPlainText } from '@/lib/cover-letter-markdown'
import { useCoverLetterRefine } from '@/hooks/use-cover-letter-refine'
import { CoverLetterPreview } from './cover-letter-preview'
import { CoverLetterProposal } from './cover-letter-proposal'
import { RefineControls } from './refine-controls'
import { DownloadCoverLetterPdfButton } from './download-cover-letter-pdf-button'

interface Props {
  value: string
  onChange: (next: string) => void
  fileName: string
  // When present, AI refine actions are surfaced; omitted, the editor renders
  // without them.
  coverLetterId?: string
  // 'split' puts the AI controls in a side rail beside the letter on large
  // screens (the dedicated editor route); 'stacked' keeps them above the letter
  // (the narrow JobDrawer). Both stack on small screens.
  layout?: 'stacked' | 'split'
}

type Mode = 'edit' | 'preview'

export function CoverLetterEditor({ value, onChange, fileName, coverLetterId, layout = 'stacked' }: Props) {
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

  // Always called (rules of hooks); inert when there is no letter id.
  const refine = useCoverLetterRefine(coverLetterId ?? '', value, onChange)
  const refineOn = Boolean(coverLetterId)
  const split = refineOn && layout === 'split'
  const staged = refineOn && refine.staged

  const main = (
    <div className={cn('min-w-0 space-y-3', split && 'xl:order-1')}>
      {staged && refine.candidate !== null && refine.lastAction !== null ? (
        <CoverLetterProposal
          key={refine.proposalSeq}
          action={refine.lastAction}
          candidate={refine.candidate}
          currentBody={value}
          busy={refine.busy}
          onKeep={refine.keep}
          onDiscard={refine.discard}
          onTryAgain={refine.tryAgain}
        />
      ) : (
        <>
          {refineOn && refine.undoBody !== null ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Applied to the editor — Save edits to keep it.</span>
              <Button type="button" variant="link" size="sm" className="h-auto px-0" onClick={refine.undo}>
                <Undo2 className="size-3.5" aria-hidden="true" />
                Undo
              </Button>
            </div>
          ) : null}
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
              {/* In the split route layout, grow the edit box to fill the viewport
                  instead of a short fixed box with empty space below it. */}
              <Textarea
                id="cl-body"
                rows={14}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={cn(split && 'xl:min-h-[calc(100vh-14rem)]')}
              />
            </div>
          )}
        </>
      )}
    </div>
  )

  if (!refineOn) {
    return <div className="max-w-2xl">{main}</div>
  }

  const rail = (
    <div className={cn('space-y-3', split && 'xl:order-2 xl:sticky xl:top-0')}>
      <RefineControls busy={refine.busy} onRun={refine.run} />
      <MutationErrorAlert error={refine.error} />
    </div>
  )

  return (
    <div
      className={cn(
        'flex flex-col gap-3',
        // Split only at xl: at lg the app sidebar leaves too little width, so the
        // rail would cramp the letter — stack until there is real room.
        split && 'xl:grid xl:grid-cols-[minmax(0,1fr)_18rem] xl:items-start xl:gap-6',
      )}
    >
      {rail}
      {main}
    </div>
  )
}
