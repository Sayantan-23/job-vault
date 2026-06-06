'use client'

import dynamic from 'next/dynamic'
import { CoverLetterDocument } from './cover-letter-document'

const PDFDownloadLink = dynamic(() => import('@react-pdf/renderer').then((m) => m.PDFDownloadLink), { ssr: false })

export function DownloadCoverLetterPdfButton({ body, fileName }: { body: string; fileName: string }) {
  return (
    <PDFDownloadLink
      document={<CoverLetterDocument body={body} />}
      fileName={fileName}
      className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
    >
      {({ loading }) => (loading ? 'Preparing…' : 'Download PDF')}
    </PDFDownloadLink>
  )
}
