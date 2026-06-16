import type { ReactNode } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

/**
 * The per-page top bar that lives in the app chrome (aligned with the sidebar
 * logo). Each page supplies its own title, optional sub-line, and optional
 * right-aligned actions — so the header is page-specific, not global.
 *
 * Nested/detail pages pass `back` to render a breadcrumb-style return link above
 * the title (replacing the sub-line), so the header is the navigation anchor.
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
      <div className="min-w-0 shrink-0 space-y-0.5">
        {back ? (
          <Link
            href={back.href}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            {back.label}
          </Link>
        ) : null}
        <h1 className="truncate text-lg font-semibold">{title}</h1>
        {!back && description ? <p className="truncate text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex min-w-0 flex-1 items-center justify-end gap-2">{actions}</div> : null}
    </header>
  )
}
