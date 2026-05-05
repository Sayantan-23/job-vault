import type { ReactNode } from 'react'
import { AuthShell } from '@/components/layout/auth/auth-shell'
import '@/styles/app/theme.css'

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div data-theme-scope="app">
      <AuthShell>{children}</AuthShell>
    </div>
  )
}
