'use client'

import Link from 'next/link'

export function ResumeLauncher({ jobId }: { jobId: string }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Résumé</h3>
      <p className="text-sm text-muted-foreground">Generate a résumé tailored to this job.</p>
      <Link
        href={`/app/resumes?job=${jobId}`}
        className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent"
      >
        Generate tailored résumé →
      </Link>
    </div>
  )
}
