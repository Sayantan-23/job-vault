import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

/**
 * The per-page top bar that lives in the app chrome (aligned with the sidebar
 * logo). Each page supplies its own title, optional sub-line, and optional
 * right-aligned actions — so the header is page-specific, not global.
 *
 * Nested/detail pages pass `back` to render a back-arrow icon button immediately
 * left of the title (the standard detail-page pattern), so the header is the
 * navigation anchor. The destination label lives in the tooltip / aria-label.
 */
export function PageHeader({
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
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border px-6">
      <div className="flex min-w-0 shrink-0 items-center gap-2">
        {back ? (
          <Link
            href={back.href}
            aria-label={`Back to ${back.label}`}
            title={`Back to ${back.label}`}
            className="-ml-1 inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Link>
        ) : null}
        <div className="min-w-0 space-y-0.5">
          <h1 className="truncate text-lg font-semibold">{title}</h1>
          {description ? <p className="truncate text-xs text-muted-foreground">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex min-w-0 flex-1 items-center justify-end gap-2">{actions}</div> : null}
    </header>
  )
}
