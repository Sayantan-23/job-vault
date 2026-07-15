'use client'

import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { LoginSchema, type LoginValues } from '@/schemas/auth'
import { useLogin } from '@/hooks/use-auth'
import { safeNextPath } from '@/lib/auth-gate'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginForm() {
  const login = useLogin()
  // Keep the post-auth destination alive across the login <-> register hop.
  const next = safeNextPath(useSearchParams().get('next'))
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(LoginSchema) })

  return (
    <form onSubmit={handleSubmit((values) => login.mutate(values))} className="space-y-6" noValidate>
      <div className="space-y-1.5">
        <h1 className="font-serif text-3xl leading-none tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">Sign in to your JobVault account.</p>
      </div>

      {login.error ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {login.error.message}
        </p>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          {...register('email')}
        />
        {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
      </div>

      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          {...register('password')}
        />
        {errors.password ? (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        ) : null}
      </div>

      <Button type="submit" className="w-full" disabled={login.isPending}>
        {login.isPending ? 'Signing in…' : 'Sign in'}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        No account?{' '}
        <Link
          href={next ? `/register?next=${encodeURIComponent(next)}` : '/register'}
          className="font-medium text-primary hover:underline"
        >
          Create one
        </Link>
      </p>
    </form>
  )
}
