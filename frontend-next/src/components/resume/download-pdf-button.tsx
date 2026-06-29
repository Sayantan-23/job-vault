'use client'

import dynamic from 'next/dynamic'
import { Download } from 'lucide-react'
import type { ResumeContent } from '@/types/resume'
import { ResumeDocument } from './resume-document'

const PDFDownloadLink = dynamic(() => import('@react-pdf/renderer').then((m) => m.PDFDownloadLink), { ssr: false })

export function DownloadPdfButton({
  content,
  fileName,
  className = 'inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent',
  ariaLabel,
  // Opt-in leading icon — the JobDrawer launcher row wants it to match its
  // sibling Copy button; the text-only workspace surface leaves it off.
  withIcon = false,
}: {
  content: ResumeContent
  fileName: string
  className?: string
  ariaLabel?: string
  withIcon?: boolean
}) {
  return (
    <PDFDownloadLink document={<ResumeDocument content={content} />} fileName={fileName} className={className} aria-label={ariaLabel}>
      {({ loading }) => (
        <>
          {withIcon ? <Download className="size-3.5" aria-hidden="true" /> : null}
          {loading ? 'Preparing…' : 'Download PDF'}
        </>
      )}
    </PDFDownloadLink>
  )
}
