import type { ReactNode } from 'react'
import { WebShell } from '@/components/layout/web/web-shell'
import '@/styles/web/theme.css'
import '@/styles/web/landing.css'

export default function WebLayout({ children }: { children: ReactNode }) {
  return (
    <div data-theme-scope="web">
      <WebShell>{children}</WebShell>
    </div>
  )
}
