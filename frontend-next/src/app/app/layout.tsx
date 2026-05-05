import type { ReactNode } from 'react'
import { AppShell } from '@/components/layout/app/app-shell'
import '@/styles/app/theme.css'

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <div data-theme-scope="app">
      <AppShell>{children}</AppShell>
    </div>
  )
}
