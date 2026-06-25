import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/**
 * A settings panel: a de-boxed section with a small section heading +
 * optional description in its own header, then the section's content. Sits flat
 * on the page canvas — no fill, no enclosing box — separated from the next
 * section by a top hairline plus the grid's spacing, so each section reads as a
 * distinct, clearly titled block. The parent grid owns the gap between cards, so
 * the card itself carries no outer margin.
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
    <section className={cn('border-t border-hairline pt-5', className)}>
      <div className="space-y-1 border-b border-hairline pb-4">
        <h2 className="text-sm font-medium text-foreground">{title}</h2>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      <div className="pt-4">{children}</div>
    </section>
  )
}
