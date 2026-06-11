// frontend-next/src/components/profile/profile-section.tsx
import type { ReactNode } from 'react'

// Two-column "settings" section: meta on the left, fields on the right, with a
// hairline divider between sections. Stacks to one column on narrow screens.
// Shared by the master ProfileEditor and the persona editor.
export function ProfileSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: ReactNode
}) {
  return (
    <section className="grid gap-x-10 gap-y-4 border-t border-border py-8 first:border-t-0 first:pt-0 sm:grid-cols-[15rem_1fr]">
      <div className="space-y-1">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  )
}
