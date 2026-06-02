import type { ReactNode } from 'react'
import Link from 'next/link'
import { Logo } from '@/components/shared/logo'

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12 text-foreground">
      <div className="w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>

        <div className="rounded-xl border border-border bg-card p-8 text-card-foreground shadow-[0_1px_2px_rgba(17,17,17,0.04),0_20px_44px_-28px_rgba(17,17,17,0.16)]">
          {children}
        </div>

        <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
          By continuing you agree to our{' '}
          <Link href="/terms" className="underline-offset-2 hover:text-foreground hover:underline">
            Terms
          </Link>{' '}
          and{' '}
          <Link href="/privacy" className="underline-offset-2 hover:text-foreground hover:underline">
            Privacy Policy
          </Link>
          .
        </p>
      </div>
    </div>
  )
}
