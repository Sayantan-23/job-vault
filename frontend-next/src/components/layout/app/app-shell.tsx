import type { ReactNode } from 'react'

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-56 border-r p-4 text-sm">
        <div className="font-semibold mb-4">JobVault</div>
        <nav className="text-muted-foreground">Sidebar (Phase 1)</nav>
      </aside>
      <div className="flex-1 flex flex-col">
        <header className="border-b px-6 py-3 text-sm">App Header (Phase 1)</header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  )
}
