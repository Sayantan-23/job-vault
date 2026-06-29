'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'

// Compact action style shared by the launcher rows' quick actions (Copy +
// Download), so the CopyButton and the react-pdf download <a> line up pixel-wise.
export const LAUNCHER_ACTION_CLASS =
  'inline-flex h-8 items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-xs font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'

interface Props {
  // The full-editor destination — the title is the navigation target; the
  // quick actions sit beside it so they never nest inside the <a>.
  href: string
  title: string
  meta?: string
  actions?: ReactNode
}

// The launcher's call-to-action ("Generate … →" / "Generate another →") —
// styled to match the quick-action buttons; navigates to the workspace.
export function LauncherActionLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {children}
    </Link>
  )
}

// One existing document (résumé / cover letter) inside a JobDrawer launcher:
// the title links to its full surface, with optional inline quick actions
// (Copy / Download) that work without leaving the drawer.
export function DocumentLauncherRow({ href, title, meta, actions }: Props) {
  return (
    <div className="flex items-center gap-2 py-2">
      <Link
        href={href}
        className="group min-w-0 flex-1 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <p className="truncate text-sm font-medium group-hover:underline">{title}</p>
        {meta ? <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p> : null}
      </Link>
      {actions ? <div className="flex shrink-0 items-center gap-1.5">{actions}</div> : null}
    </div>
  )
}
