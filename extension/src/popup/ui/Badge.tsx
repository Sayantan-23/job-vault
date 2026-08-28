import type { ReactNode } from 'react'

const TONES = {
  primary: 'bg-primary/10 text-primary',
  success: 'bg-success/12 text-success',
} as const

// Small muted-pastel pill used for the capture source / supported sites.
export function Badge({
  children,
  tone = 'primary',
}: {
  children: ReactNode
  tone?: keyof typeof TONES
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${TONES[tone]}`}
    >
      {children}
    </span>
  )
}
