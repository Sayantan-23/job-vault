import type { Metadata } from 'next'
import { Button } from '@/components/ui/button'
export const metadata: Metadata = { title: 'Register' }
export default function RegisterPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Register</h1>
      <p className="text-sm text-muted-foreground">Phase 1 wires the real form.</p>
      <Button disabled>Create account</Button>
    </div>
  )
}
