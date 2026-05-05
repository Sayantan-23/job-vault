import type { ReactNode } from 'react'

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-6">
      <div className="w-full max-w-md rounded-md border bg-card text-card-foreground p-8 shadow-sm">
        {children}
      </div>
    </div>
  )
}
