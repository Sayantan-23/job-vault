import type { ReactNode } from 'react'
import { AccountMenu } from './account-menu'
import { SidebarNav } from './sidebar-nav'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen justify-center overflow-hidden bg-background text-foreground">
      {/* The whole app is a centered composition: sidebar + content share one
          max-width frame, so the rail isn't glued to the viewport edge and every
          page renders at the same width. */}
      <div className="flex w-full min-w-0 max-w-[1240px]">
        {/* The rail dissolves into the canvas: no panel fill, no right border, no
            internal dividers — a quiet list of places, not a chrome bar. */}
        <aside className="flex w-60 shrink-0 flex-col">
          <div className="px-5 pb-2 pt-5 text-[15px] font-semibold tracking-tight">JobVault</div>
          <SidebarNav />
          <div className="mt-auto p-3">
            <AccountMenu />
          </div>
        </aside>
        {/* Each page supplies its own in-content editorial header (PageHeading). */}
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  )
}
