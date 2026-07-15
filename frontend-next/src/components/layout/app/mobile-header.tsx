'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NotificationBell } from '@/components/notifications/notification-bell'
import { cn } from '@/lib/utils'
import { AccountMenu } from './account-menu'
import { BrandMark } from './brand-mark'
import { NAV } from './sidebar-nav'

// Mobile-only (below lg) top bar + a Google-Keep-style speed-dial nav. The
// desktop rail is `hidden lg:flex`, so exactly one of the two renders per width.
export function MobileHeader() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const mountedRef = useRef(false)

  // Close on route change — but not on the initial mount (menu starts closed).
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    setOpen(false)
  }, [pathname])

  // Escape closes and returns focus to the toggle.
  useEffect(() => {
    if (!open) return
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  return (
    <div className="sticky top-0 z-40 lg:hidden">
      {/* No z on the bar itself (and no backdrop-blur while open, which would
          create a stacking context): when the menu is open the scrim (z-20)
          dims the whole bar; only the toggle (z-30) stays above it. */}
      <div
        className={cn(
          'relative flex h-14 items-center gap-3 border-b border-hairline bg-background/95 px-6 sm:px-8',
          !open && 'backdrop-blur',
        )}
      >
        <button
          ref={toggleRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close navigation' : 'Open navigation'}
          className="relative z-30 -ml-2 grid size-11 place-items-center rounded-full bg-accent text-foreground transition-colors"
        >
          <span className="relative block h-3.5 w-[18px]" aria-hidden="true">
            <span
              className={cn(
                'absolute left-0 h-0.5 w-full rounded-full bg-current transition-all duration-200 ease-out motion-reduce:transition-none',
                open ? 'top-1/2 -translate-y-1/2 rotate-45' : 'top-0',
              )}
            />
            <span
              className={cn(
                'absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 rounded-full bg-current transition-opacity duration-200 ease-out motion-reduce:transition-none',
                open ? 'opacity-0' : 'opacity-100',
              )}
            />
            <span
              className={cn(
                'absolute left-0 h-0.5 w-full rounded-full bg-current transition-all duration-200 ease-out motion-reduce:transition-none',
                open ? 'top-1/2 -translate-y-1/2 -rotate-45' : 'bottom-0',
              )}
            />
          </span>
        </button>

        <div className="flex items-center gap-2.5">
          <BrandMark />
          <span className="text-[15px] font-semibold tracking-tight">JobVault</span>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <NotificationBell />
          <AccountMenu compact side="bottom" />
        </div>
      </div>

      {open ? (
        <>
          {/* Scrim + click-catcher: dims the page like the app's modals (same
              treatment as the Sheet/Dialog overlay) and closes on outside tap.
              Sits below the pills (z-0). */}
          <button
            type="button"
            aria-hidden="true"
            tabIndex={-1}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-20 cursor-default bg-black/40 backdrop-blur-[1px] animate-jv-overlay-in motion-reduce:animate-none"
          />
          <nav
            id="mobile-nav"
            aria-label="Main navigation"
            className="absolute left-4 top-14 z-30 flex flex-col gap-2.5"
          >
            {NAV.map(({ href, label, icon: Icon }, index) => {
              const active = pathname === href || pathname.startsWith(`${href}/`)
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  style={{ animationDelay: `${index * 40}ms` }}
                  className="flex items-center gap-2.5 animate-jv-fab-item motion-reduce:animate-none"
                >
                  <span
                    className={cn(
                      'grid size-11 shrink-0 place-items-center rounded-full border shadow-sm transition-colors',
                      active
                        ? 'border-transparent bg-primary text-primary-foreground'
                        : 'border-hairline bg-card text-muted-foreground',
                    )}
                  >
                    <Icon className="size-4" aria-hidden="true" />
                  </span>
                  <span
                    className={cn(
                      'rounded-full border border-hairline bg-card px-3.5 py-2 text-sm shadow-sm',
                      active ? 'font-semibold text-foreground' : 'font-medium text-foreground',
                    )}
                  >
                    {label}
                  </span>
                </Link>
              )
            })}
          </nav>
        </>
      ) : null}
    </div>
  )
}
