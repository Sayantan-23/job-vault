import type { ReactNode } from 'react'
import { AccountMenu } from './account-menu'
import { SidebarNav } from './sidebar-nav'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <aside className="flex w-60 shrink-0 flex-col border-r border-border">
        <div className="flex h-16 shrink-0 items-center border-b border-border px-5 font-semibold tracking-tight">
          JobVault
        </div>
        <SidebarNav />
        <div className="mt-auto border-t border-border p-3">
          <AccountMenu />
        </div>
      </aside>
      {/* The page owns its own header (PageHeader) + scroll region, so the chrome
          stays fixed while each page supplies its own title/actions. */}
      <main className="flex min-w-0 flex-1 flex-col">{children}</main>
    </div>
  )
}
