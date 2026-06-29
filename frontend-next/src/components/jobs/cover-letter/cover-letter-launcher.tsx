'use client'

import { useCoverLetters } from '@/hooks/use-cover-letters'
import { coverLetterToPlainText } from '@/lib/cover-letter-markdown'
import { shortDate } from '@/lib/relative-time'
import { CopyButton } from '@/components/documents/copy-button'
import { DownloadCoverLetterPdfButton } from '@/components/resume/download-cover-letter-pdf-button'
import { DocumentLauncherRow, LauncherActionLink, LAUNCHER_ACTION_CLASS } from '../document-launcher-row'

// Opens the cover-letters workspace with the New sheet pre-opened and this job
// pre-selected (the sheet reads ?new + ?job). Keeps generation on the dedicated
// page instead of an inline form crammed into the drawer.
const generateHref = (jobId: string) => `/app/cover-letters?new=1&job=${jobId}`

const pdfName = (title: string | null) => `${(title ?? 'cover-letter').replace(/\s+/g, '-')}.pdf`

// JobDrawer cover-letter launcher: an action button when there is none, or the
// existing letters as rows (quick Copy / Download in place, title → full editor)
// plus a "Generate another" button. Mirrors the résumé launcher beside it.
export function CoverLetterLauncher({ jobId }: { jobId: string }) {
  const { data: letters = [] } = useCoverLetters(jobId)

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Cover letter</h3>
      {letters.length === 0 ? (
        <>
          <p className="text-sm text-muted-foreground">Generate a cover letter tailored to this job.</p>
          <LauncherActionLink href={generateHref(jobId)}>Generate cover letter →</LauncherActionLink>
        </>
      ) : (
        <>
          <ul className="divide-y divide-hairline">
            {letters.map((letter) => {
              const title = letter.title ?? 'Untitled'
              return (
                <li key={letter.id}>
                  <DocumentLauncherRow
                    href={`/app/cover-letters/${letter.id}`}
                    title={title}
                    meta={shortDate(letter.createdAt)}
                    actions={
                      <>
                        {/* Per-row aria-labels so AT can tell apart the controls when a job has several letters. */}
                        <CopyButton getText={() => coverLetterToPlainText(letter.bodyMarkdown)} ariaLabel={`Copy ${title}`} className="h-8" />
                        <DownloadCoverLetterPdfButton body={letter.bodyMarkdown} fileName={pdfName(letter.title)} ariaLabel={`Download ${title} (PDF)`} className={LAUNCHER_ACTION_CLASS} />
                      </>
                    }
                  />
                </li>
              )
            })}
          </ul>
          <LauncherActionLink href={generateHref(jobId)}>Generate another →</LauncherActionLink>
        </>
      )}
    </div>
  )
}
