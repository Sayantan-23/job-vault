import type { ReactNode } from 'react'
import { AccountMenu } from './account-menu'
import { SidebarNav } from './sidebar-nav'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* The sidebar carries the left gutter so the sidebar + content still read as
          a centered ~1240px composition, while `main` runs to the viewport's right
          edge — so the scrollbar sits at the window edge, not mid-page.
          (left gutter == right gutter == (100% - 1240px) / 2.) */}
      <aside
        style={{ marginLeft: 'max(0px, calc((100% - 1240px) / 2))' }}
        className="flex w-60 shrink-0 flex-col"
      >
        <div className="px-5 pb-2 pt-5 text-[15px] font-semibold tracking-tight">JobVault</div>
        <SidebarNav />
        <div className="mt-auto p-3">
          <AccountMenu />
        </div>
      </aside>
      {/* Each page supplies its own in-content editorial header (PageHeading).
          `app-scroll` styles the window-edge scrollbar thin + on-theme. */}
      <main className="app-scroll flex min-w-0 flex-1 flex-col overflow-y-auto">{children}</main>
    </div>
  )
}
