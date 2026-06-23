import type { ReactNode } from 'react'

// Small muted-pastel pill used for the capture source / supported sites.
export function Badge({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary">
      {children}
    </span>
  )
}
