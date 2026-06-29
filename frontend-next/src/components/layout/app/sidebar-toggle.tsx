'use client'

import { useEffect, useState } from 'react'
import { ChevronsLeft, ChevronsRight } from 'lucide-react'
import { readSidebar, writeSidebar, applySidebar } from '@/lib/sidebar'

/**
 * Collapse / expand the rail. Two affordances share one toggle, both revealed on
 * rail hover (or handle focus):
 *  - the round double-chevron handle on the right edge — the keyboard-accessible,
 *    labelled control; and
 *  - the soft right-edge shadow itself, a full-height click strip so a click
 *    anywhere along the hovered edge toggles too (an easier target than the
 *    small handle).
 * Visual layout is CSS-driven off `data-sidebar`; this owns only the cookie +
 * attribute flip + the icon.
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

  const label = collapsed ? 'Expand sidebar' : 'Collapse sidebar'
  const Icon = collapsed ? ChevronsRight : ChevronsLeft
  return (
    <>
      {/* The soft right-edge shadow doubles as a full-height click target for the
          toggle. The handle below is the labelled control, so this is decorative
          for assistive tech (aria-hidden, out of the tab order). Pointer events
          are gated on rail hover — matching the handle — so it never swallows
          clicks in the content gutter when the rail isn't hovered. */}
      <button
        type="button"
        tabIndex={-1}
        aria-hidden="true"
        onClick={toggle}
        className="jv-rail-edge pointer-events-none cursor-pointer appearance-none border-0 p-0 opacity-0 transition-opacity duration-200 group-hover:pointer-events-auto group-hover:opacity-100"
      />
      <button
        type="button"
        onClick={toggle}
        title={label}
        aria-label={label}
        className="pointer-events-none absolute right-0 top-1/2 z-20 grid size-7 -translate-y-1/2 translate-x-1/2 place-items-center rounded-full border border-border bg-card text-muted-foreground opacity-0 shadow-sm transition-opacity duration-150 hover:text-foreground group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100"
      >
        <Icon className="size-4" aria-hidden="true" />
      </button>
    </>
  )
}
