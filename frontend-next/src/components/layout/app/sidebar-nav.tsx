'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Briefcase, Users, FileText, Mail, Clock } from 'lucide-react'
import { SidebarNotifications } from '@/components/notifications/sidebar-notifications'
import { cn } from '@/lib/utils'

// Dashboard is gone (the jobs workspace is the home now). Profile + Settings live
// in the account menu at the bottom of the rail.
const NAV = [
  { href: '/app/jobs', label: 'Jobs', icon: Briefcase },
  { href: '/app/personas', label: 'Personas', icon: Users },
  { href: '/app/resumes', label: 'Résumés', icon: FileText },
  { href: '/app/cover-letters', label: 'Cover letters', icon: Mail },
  { href: '/app/timeline', label: 'Timeline', icon: Clock },
] as const

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-col gap-0.5 px-3 py-2">
      {NAV.map(({ href, label, icon: Icon }) => {
        const active = pathname === href || pathname.startsWith(`${href}/`)
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
              active
                ? 'bg-accent font-medium text-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
          </Link>
        )
      })}
      <SidebarNotifications />
    </nav>
  )
}
