import type { ReactNode } from 'react'
import { AppShell } from '@/components/layout/app/app-shell'
import { RealtimeProvider } from '@/components/shared/realtime-provider'
import '@/styles/app/theme.css'

export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  return (
    <div data-theme-scope="app">
      <RealtimeProvider>
        <AppShell>{children}</AppShell>
      </RealtimeProvider>
    </div>
  )
}
