import Link from 'next/link'
import { FileQuestion } from 'lucide-react'
import { buttonVariants } from '@/components/ui/button'

// Rendered inline by the editor route (so it keeps the app shell + sidebar) when
// a cover letter's SSR fetch misses — a bad/unowned id, a stale bookmark, or a
// letter deleted in another session. Rendered inline rather than via Next's
// notFound() boundary, which does not inherit the authenticated app layout.
export function CoverLetterNotFound() {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <FileQuestion className="size-10 text-muted-foreground" aria-hidden="true" />
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Cover letter not found</h1>
        <p className="text-sm text-muted-foreground">
          It may have been deleted, or you don&rsquo;t have access to it.
        </p>
      </div>
      <Link href="/app/cover-letters" className={buttonVariants({ size: 'sm' })}>
        Back to cover letters
      </Link>
    </div>
  )
}
