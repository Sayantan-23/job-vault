import type { ReactNode } from 'react'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { AccountMenu } from './account-menu'
import { BrandMark } from './brand-mark'
import { MobileHeader } from './mobile-header'
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
        className="group jv-rail relative hidden shrink-0 flex-col lg:flex"
      >
        <div className="jv-rail-brand flex items-center gap-2.5 px-5 pb-2 pt-5">
          <BrandMark />
          <span className="jv-rail-label text-[15px] font-semibold tracking-tight">JobVault</span>
        </div>
        <SidebarNav />
        <div className="jv-account-foot mt-auto p-3">
          <AccountMenu />
        </div>
        {/* On rail hover: a soft shadow cast off the right edge (strongest
            mid-height, fading top + bottom) plus the collapse handle — both are
            click targets for the toggle (see SidebarToggle). */}
        <SidebarToggle />
      </aside>
      {/* Each page supplies its own in-content editorial header (PageHeading).
          `app-scroll` styles the window-edge scrollbar thin + on-theme. */}
      <main className="app-scroll flex min-w-0 flex-1 flex-col overflow-y-auto">
        {/* Below lg the rail is hidden; MobileHeader carries the brand, nav
            trigger, bell, and account menu. It's the scroll container's first
            child so its `sticky top-0` pins to the canvas top. */}
        <MobileHeader />
        {/* The notification bell floats at the top-right of the canvas — a
            featherweight header that stays put on scroll. It shares the page's
            content column + padding so it lines up above each PageHeading's
            actions. Zero-height + pointer-events-none so it never displaces or
            blocks the page beneath; only the bell itself is interactive.
            Hidden below lg — MobileHeader renders the bell there instead. */}
        <div className="pointer-events-none sticky top-0 z-30 hidden h-0 lg:block">
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
