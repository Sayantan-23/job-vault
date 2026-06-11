// frontend-next/src/components/profile/profile-section.tsx
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

// Editor section with a hairline divider between sections, in two layouts:
// - 'two-column' (default): meta on the left, fields on the right — the wide
//   "settings" layout used by the master ProfileEditor on /app/profile.
// - 'stacked': meta above fields — for narrow containers like the persona sheets.
export function ProfileSection({
  title,
  description,
  children,
  layout = 'two-column',
}: {
  title: string
  description: string
  children: ReactNode
  layout?: 'two-column' | 'stacked'
}) {
  const twoColumn = layout === 'two-column'
  return (
    <section
      className={cn(
        'border-t border-border first:border-t-0 first:pt-0',
        twoColumn ? 'grid gap-x-10 gap-y-4 py-8 sm:grid-cols-[15rem_1fr]' : 'space-y-3 py-6',
      )}
    >
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}
