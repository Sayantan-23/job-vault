'use client'

import dynamic from 'next/dynamic'
import type { ResumeContent } from '@/types/resume'
import { ResumeDocument } from './resume-document'

const PDFDownloadLink = dynamic(() => import('@react-pdf/renderer').then((m) => m.PDFDownloadLink), { ssr: false })

export function DownloadPdfButton({ content, fileName }: { content: ResumeContent; fileName: string }) {
  return (
    <PDFDownloadLink
      document={<ResumeDocument content={content} />}
      fileName={fileName}
      className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
    >
      {({ loading }) => (loading ? 'Preparing…' : 'Download PDF')}
    </PDFDownloadLink>
  )
}
