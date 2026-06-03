'use client'

import { LogOut } from 'lucide-react'
import { useLogout } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'

export function LogoutButton() {
  const logout = useLogout()
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => logout.mutate()}
      disabled={logout.isPending}
      className="w-full justify-start gap-2.5 text-muted-foreground"
    >
      <LogOut className="size-4" aria-hidden="true" />
      {logout.isPending ? 'Signing out…' : 'Sign out'}
    </Button>
  )
}
