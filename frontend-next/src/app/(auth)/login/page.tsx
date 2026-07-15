import type { Metadata } from 'next'
import { Suspense } from 'react'
import { LoginForm } from '@/components/auth/login-form'

export const metadata: Metadata = { title: 'Login' }

// Suspense: LoginForm reads useSearchParams (?next=), which a static page
// must resolve client-side.
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
