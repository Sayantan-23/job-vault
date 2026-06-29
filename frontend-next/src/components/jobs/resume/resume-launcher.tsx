'use client'

import { useResumes, fetchResumeTex } from '@/hooks/use-resumes'
import { shortDate } from '@/lib/relative-time'
import { CopyButton } from '@/components/documents/copy-button'
import { DownloadPdfButton } from '@/components/resume/download-pdf-button'
import { DocumentLauncherRow, LauncherActionLink, LAUNCHER_ACTION_CLASS } from '../document-launcher-row'

// The résumés surface is a workspace (no per-id route): ?resume selects this one
// in the list and opens it; ?job pre-fills the generator's job picker.
const openHref = (resumeId: string) => `/app/resumes?resume=${resumeId}`
const generateHref = (jobId: string) => `/app/resumes?job=${jobId}`

const pdfName = (title: string | null) => `${(title ?? 'resume').replace(/\s+/g, '-')}.pdf`

// JobDrawer résumé launcher: an action button when there is none, or the
// existing résumés as rows (quick Copy LaTeX / Download in place, title → the
// workspace with it open) plus a "Generate another" button.
export function ResumeLauncher({ jobId }: { jobId: string }) {
  const { data: resumes = [] } = useResumes(jobId)

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Résumé</h3>
      {resumes.length === 0 ? (
        <>
          <p className="text-sm text-muted-foreground">Generate a résumé tailored to this job.</p>
          <LauncherActionLink href={generateHref(jobId)}>Generate tailored résumé →</LauncherActionLink>
        </>
      ) : (
        <>
          <ul className="divide-y divide-hairline">
            {resumes.map((resume) => {
              const title = resume.title ?? 'Untitled'
              return (
                <li key={resume.id}>
                  <DocumentLauncherRow
                    href={openHref(resume.id)}
                    title={title}
                    meta={shortDate(resume.createdAt)}
                    actions={
                      <>
                        {/* Per-row aria-labels so AT can tell apart the controls when a job has several résumés. */}
                        <CopyButton getText={async () => (await fetchResumeTex(resume.id)).tex} label="Copy LaTeX" ariaLabel={`Copy ${title} (LaTeX)`} className="h-8" />
                        <DownloadPdfButton content={resume.content} fileName={pdfName(resume.title)} ariaLabel={`Download ${title} (PDF)`} withIcon className={LAUNCHER_ACTION_CLASS} />
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
