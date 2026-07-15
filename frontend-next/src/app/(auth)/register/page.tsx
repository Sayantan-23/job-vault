import type { Metadata } from 'next'
import { Suspense } from 'react'
import { RegisterForm } from '@/components/auth/register-form'

export const metadata: Metadata = { title: 'Register' }

// Suspense: RegisterForm reads useSearchParams (?next=), which a static page
// must resolve client-side.
export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  )
}
