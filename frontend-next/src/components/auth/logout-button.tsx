'use client'

import { useLogout } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'

export function LogoutButton() {
  const logout = useLogout()
  return (
    <Button variant="ghost" size="sm" onClick={() => logout.mutate()} disabled={logout.isPending}>
      {logout.isPending ? 'Signing out…' : 'Sign out'}
    </Button>
  )
}
