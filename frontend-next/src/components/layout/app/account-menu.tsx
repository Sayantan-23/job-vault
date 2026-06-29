'use client'

import Link from 'next/link'
import { ChevronsUpDown, User, Settings, LogOut } from 'lucide-react'
import {
  AnchoredPopover,
  AnchoredPopoverTrigger,
  AnchoredPopoverContent,
  AnchoredPopoverClose,
} from '@/components/ui/anchored-popover'
import { MonogramAvatar } from '@/components/ui/avatar'
import { useCurrentUser, useLogout } from '@/hooks/use-auth'
import { cn } from '@/lib/utils'

const ITEM =
  'flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-foreground transition-colors hover:bg-accent hover:text-accent-foreground'

function Identity({ name, email }: { name: string; email: string }) {
  return (
    <span className="min-w-0 flex-1 text-left">
      <span className="block truncate text-sm font-medium text-foreground">{name}</span>
      {email ? <span className="block truncate text-xs text-muted-foreground">{email}</span> : null}
    </span>
  )
}

export function AccountMenu() {
  const { data: user } = useCurrentUser()
  const logout = useLogout()
  const name = user?.name?.trim() || 'Account'
  const email = user?.email ?? ''

  return (
    <AnchoredPopover>
      <AnchoredPopoverTrigger asChild>
        <button
          type="button"
          aria-label="Open account menu"
          className="jv-rail-item flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-accent"
        >
          <MonogramAvatar name={name} />
          <span className="jv-rail-label min-w-0 flex-1 truncate text-left text-sm font-medium text-foreground">
            {name}
          </span>
          <ChevronsUpDown className="jv-rail-label size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      </AnchoredPopoverTrigger>

      {/* Fixed width — the trigger shrinks to just the avatar when the rail is
          collapsed, so binding to --radix-popover-trigger-width crushed the menu. */}
      <AnchoredPopoverContent side="top" align="start" sideOffset={8} className="w-56">
        <div className="flex items-center gap-2.5 px-2.5 py-2">
          <MonogramAvatar name={name} />
          <Identity name={name} email={email} />
        </div>
        <div className="my-1 h-px bg-border" />
        <AnchoredPopoverClose asChild>
          <Link href="/app/profile" className={ITEM}>
            <User className="size-4 text-muted-foreground" aria-hidden="true" />
            Profile
          </Link>
        </AnchoredPopoverClose>
        <AnchoredPopoverClose asChild>
          <Link href="/app/settings" className={ITEM}>
            <Settings className="size-4 text-muted-foreground" aria-hidden="true" />
            Settings
          </Link>
        </AnchoredPopoverClose>
        <div className="my-1 h-px bg-border" />
        <AnchoredPopoverClose asChild>
          <button
            type="button"
            onClick={() => logout.mutate()}
            disabled={logout.isPending}
            className={cn(ITEM, 'disabled:opacity-50')}
          >
            <LogOut className="size-4 text-muted-foreground" aria-hidden="true" />
            {logout.isPending ? 'Signing out…' : 'Sign out'}
          </button>
        </AnchoredPopoverClose>
      </AnchoredPopoverContent>
    </AnchoredPopover>
  )
}
