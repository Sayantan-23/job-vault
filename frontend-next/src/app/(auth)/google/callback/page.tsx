import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Google Sign-in' }
export default function GoogleCallbackPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Signing in…</h1>
      <p className="text-sm text-muted-foreground">Phase 1 implements the OAuth handoff.</p>
    </div>
  )
}
