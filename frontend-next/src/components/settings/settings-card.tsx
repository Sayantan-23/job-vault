import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * A settings panel: a flat hairline card with a small section heading +
 * optional description in its own header, then the section's content. Used in
 * the two-column settings grid so each section reads as a distinct, clearly
 * titled block instead of a single tall column. The parent grid owns the gap
 * between cards, so the card itself carries no outer margin.
 */
export function SettingsCard({
  title,
  description,
  children,
  className,
}: {
  title: string
  description?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={cn('rounded-xl border border-border bg-card', className)}>
      <div className="space-y-1 border-b border-border px-5 py-4">
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="px-5 py-4">{children}</div>
    </section>
  )
}
