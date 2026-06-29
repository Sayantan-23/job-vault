import type { ReactNode } from 'react'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { AccountMenu } from './account-menu'
import { SidebarNav } from './sidebar-nav'
import { SidebarToggle } from './sidebar-toggle'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* The sidebar carries the left gutter so the sidebar + content read as a
          centered ~1240px composition, while `main` runs to the viewport's right
          edge — so the scrollbar sits at the window edge. The rail collapses to
          icons (content widens) without changing the 1240px total or the gutter. */}
      <aside
        style={{ marginLeft: 'max(0px, calc((100% - 1240px) / 2))' }}
        className="group jv-rail relative flex shrink-0 flex-col"
      >
        <div className="jv-rail-brand flex items-center gap-2.5 px-5 pb-2 pt-5">
          <span
            aria-hidden="true"
            className="grid size-8 shrink-0 place-items-center rounded-[10px] bg-primary text-primary-foreground"
          >
            <svg
              width="17"
              height="17"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            >
              <circle cx="12" cy="12" r="7.5" />
              <path d="M12 12V5.5" />
              <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
            </svg>
          </span>
          <span className="jv-rail-label text-[15px] font-semibold tracking-tight">JobVault</span>
        </div>
        <SidebarNav />
        <div className="jv-account-foot mt-auto p-3">
          <AccountMenu />
        </div>
        {/* On rail hover: a soft shadow cast off the right edge (strongest mid-height,
            fading top + bottom) plus the collapse handle. */}
        <div
          aria-hidden="true"
          className="jv-rail-edge opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        />
        <SidebarToggle />
      </aside>
      {/* Each page supplies its own in-content editorial header (PageHeading).
          `app-scroll` styles the window-edge scrollbar thin + on-theme. */}
      <main className="app-scroll flex min-w-0 flex-1 flex-col overflow-y-auto">
        {/* The notification bell floats at the top-right of the canvas — a
            featherweight header that stays put on scroll. It shares the page's
            content column + padding so it lines up above each PageHeading's
            actions. Zero-height + pointer-events-none so it never displaces or
            blocks the page beneath; only the bell itself is interactive. */}
        <div className="pointer-events-none sticky top-0 z-30 h-0">
          <div className="jv-content-col w-full px-6 pt-4 sm:px-8 lg:px-10">
            <div className="flex justify-end">
              <NotificationBell className="pointer-events-auto" />
            </div>
          </div>
        </div>
        {children}
      </main>
    </div>
  )
}
