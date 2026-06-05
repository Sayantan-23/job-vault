'use client'

import dynamic from 'next/dynamic'
import type { ResumeContent } from '@/types/resume'
import { ResumeDocument } from './resume-document'

// PDFViewer touches browser APIs; load client-only.
const PDFViewer = dynamic(() => import('@react-pdf/renderer').then((m) => m.PDFViewer), { ssr: false })

export function ResumePreview({ content }: { content: ResumeContent }) {
  return (
    <div className="h-[70vh] w-full overflow-hidden rounded-lg border border-border">
      <PDFViewer width="100%" height="100%" showToolbar={false}>
        <ResumeDocument content={content} />
      </PDFViewer>
    </div>
  )
}
