import type { ReactNode } from 'react'
import Link from 'next/link'
import { LayoutDashboard, Clock, Settings } from 'lucide-react'
import { LogoutButton } from '@/components/auth/logout-button'

const NAV = [
  { href: '/app/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/app/timeline', label: 'Timeline', icon: Clock },
  { href: '/app/settings', label: 'Settings', icon: Settings },
] as const

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex">
      <aside className="w-60 shrink-0 border-r border-border flex flex-col">
        <div className="h-14 flex items-center px-5 font-semibold tracking-tight">JobVault</div>
        <nav className="flex flex-col gap-0.5 px-3 py-2">
          {NAV.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              <Icon className="size-4" aria-hidden="true" />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 border-b border-border flex items-center justify-end gap-3 px-6">
          <LogoutButton />
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
