'use client'

import dynamic from 'next/dynamic'
import { Download } from 'lucide-react'
import { CoverLetterDocument } from './cover-letter-document'

const PDFDownloadLink = dynamic(() => import('@react-pdf/renderer').then((m) => m.PDFDownloadLink), { ssr: false })

export function DownloadCoverLetterPdfButton({ body, fileName }: { body: string; fileName: string }) {
  return (
    <PDFDownloadLink
      document={<CoverLetterDocument body={body} />}
      fileName={fileName}
      className="inline-flex h-9 items-center gap-2 rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
    >
      {({ loading }) => (
        <>
          <Download className="size-3.5" aria-hidden="true" />
          {loading ? 'Preparing…' : 'Download PDF'}
        </>
      )}
    </PDFDownloadLink>
  )
}
