'use client'

import { useEffect, useState } from 'react'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import { readSidebar, writeSidebar, applySidebar } from '@/lib/sidebar'

/**
 * Collapse / expand the rail — a small handle that appears on the sidebar's right
 * edge (vertically centred) when the rail is hovered or the button is focused.
 * Icon-only, the logo is left alone, and it sits in the same spot whether the
 * rail is expanded or collapsed. Visual layout is CSS-driven off `data-sidebar`;
 * this owns only the cookie + attribute flip + its icon.
 */
export function SidebarToggle() {
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setCollapsed(readSidebar() === 'collapsed')
  }, [])

  function toggle() {
    const next: 'expanded' | 'collapsed' = collapsed ? 'expanded' : 'collapsed'
    setCollapsed(!collapsed)
    writeSidebar(next)
    applySidebar(next)
  }

  const Icon = collapsed ? ChevronsRight : ChevronsLeft
  return (
    <button
      type="button"
      onClick={toggle}
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      className="pointer-events-none absolute right-0 top-1/2 z-20 grid size-7 -translate-y-1/2 translate-x-1/2 place-items-center rounded-full border border-border bg-card text-muted-foreground opacity-0 shadow-sm transition-opacity duration-150 hover:text-foreground group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100"
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  )
}
