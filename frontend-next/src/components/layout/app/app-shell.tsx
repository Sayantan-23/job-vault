import type { ReactNode } from 'react'
import { LogoutButton } from '@/components/auth/logout-button'
import { SidebarNav } from './sidebar-nav'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="h-screen overflow-hidden bg-background text-foreground flex">
      <aside className="w-60 shrink-0 border-r border-border flex flex-col">
        <div className="h-14 flex items-center px-5 font-semibold tracking-tight">JobVault</div>
        <SidebarNav />
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 shrink-0 border-b border-border flex items-center justify-end gap-3 px-6">
          <LogoutButton />
        </header>
        <main className="flex-1 min-h-0 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}
