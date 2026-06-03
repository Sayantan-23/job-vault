import type { ReactNode } from 'react'

/**
 * The per-page top bar that lives in the app chrome (aligned with the sidebar
 * logo). Each page supplies its own title, optional sub-line, and optional
 * right-aligned actions — so the header is page-specific, not global.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="flex h-16 shrink-0 items-center justify-between gap-4 border-b border-border px-6">
      <div className="min-w-0 space-y-0.5">
        <h1 className="truncate text-lg font-semibold">{title}</h1>
        {description ? <p className="truncate text-xs text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-3">{actions}</div> : null}
    </header>
  )
}
