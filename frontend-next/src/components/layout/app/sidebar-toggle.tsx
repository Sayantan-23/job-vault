'use client'

import { useEffect, useState } from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { readSidebar, writeSidebar, applySidebar } from '@/lib/sidebar'

/**
 * Collapse / expand the rail. Rendered as an overlay on the brand mark: the logo
 * square morphs into this toggle when the rail is hovered (or the button is
 * focused) — icon-only, no extra chrome, and it sits at the same spot whether the
 * rail is expanded or collapsed. The visual layout is CSS-driven off
 * `data-sidebar`; this only owns the cookie, the attribute flip, and its icon.
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

  const Icon = collapsed ? PanelLeftOpen : PanelLeftClose
  return (
    <button
      type="button"
      onClick={toggle}
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      className="pointer-events-none absolute inset-0 grid place-items-center rounded-[10px] text-primary-foreground opacity-0 transition-opacity duration-150 group-hover:pointer-events-auto group-hover:opacity-100 focus-visible:pointer-events-auto focus-visible:opacity-100"
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  )
}
