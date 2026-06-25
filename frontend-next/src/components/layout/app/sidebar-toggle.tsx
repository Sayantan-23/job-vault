'use client'

import { useEffect, useState } from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { readSidebar, writeSidebar, applySidebar } from '@/lib/sidebar'

/**
 * Collapse / expand the rail. The visual layout is CSS-driven off the
 * `data-sidebar` attribute (set pre-paint), so this only owns the cookie, the
 * attribute flip, and its own icon/label state (synced from the cookie on mount
 * to avoid a hydration mismatch).
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
      className="jv-rail-item flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      <span className="jv-rail-label">Collapse</span>
    </button>
  )
}
