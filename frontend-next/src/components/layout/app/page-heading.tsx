import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

/**
 * In-content editorial page header. Replaces the global bordered `PageHeader`
 * top bar: the serif title, optional sub-line, and optional actions live inside
 * the page's own content column, so content opens directly on the canvas instead
 * of below a persistent utility toolbar.
 *
 * API mirrors `PageHeader` (title / description / actions / back) so pages migrate
 * as a near drop-in. Nested/detail pages pass `back` for a quiet back link above
 * the title.
 */
export function PageHeading({
  title,
  description,
  actions,
  back,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
  back?: { href: string; label: string }
}) {
  return (
    <header className="mb-8 space-y-3">
      {back ? (
        <Link
          href={back.href}
          aria-label={`Back to ${back.label}`}
          className="-ml-1 inline-flex items-center gap-1.5 rounded-md px-1 py-0.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          {back.label}
        </Link>
      ) : null}
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0 space-y-2">
          <h1 className="font-serif text-[2.25rem] leading-[1.1] tracking-tight sm:text-[2.6rem]">
            {title}
          </h1>
          {description ? <div className="text-sm text-muted-foreground">{description}</div> : null}
        </div>
        {/* grow + justify-end: fixed-width actions keep hugging the right, while a
            flexible action (the jobs search) can absorb the leftover row width */}
        {actions ? <div className="flex grow flex-wrap items-center justify-end gap-2">{actions}</div> : null}
      </div>
    </header>
  )
}
