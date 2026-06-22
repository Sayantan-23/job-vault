'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import {
  LoginSchema,
  RegisterFormSchema,
  type LoginValues,
  type RegisterFormValues,
} from '@/schemas/auth'
import { apiClient } from '@/lib/api-client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { AuthUser } from '@/types/auth'

// A compact sign-in/sign-up form for the public /extension/authorize page. It
// posts directly (no redirect-on-success like useLogin/useRegister) and calls
// onAuthenticated so the caller can re-check the session in place.
export function InlineAuthForm({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  return mode === 'login' ? (
    <LoginPane onAuthenticated={onAuthenticated} onSwitch={() => setMode('register')} />
  ) : (
    <RegisterPane onAuthenticated={onAuthenticated} onSwitch={() => setMode('login')} />
  )
}

function ErrorAlert({ message }: { message: string }) {
  return (
    <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  )
}

function LoginPane({ onAuthenticated, onSwitch }: { onAuthenticated: () => void; onSwitch: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({ resolver: zodResolver(LoginSchema) })
  const login = useMutation({
    mutationFn: (values: LoginValues) => apiClient.post<AuthUser>('/api/auth/login', values),
    onSuccess: onAuthenticated,
  })

  return (
    <form onSubmit={handleSubmit((values) => login.mutate(values))} className="space-y-4" noValidate>
      <div className="space-y-1">
        <h2 className="font-serif text-2xl leading-none tracking-tight">Sign in to connect</h2>
        <p className="text-sm text-muted-foreground">Authorize the extension with your JobVault account.</p>
      </div>
      {login.error ? <ErrorAlert message={login.error.message} /> : null}
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} />
        {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" autoComplete="current-password" {...register('password')} />
        {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
      </div>
      <Button type="submit" className="w-full" disabled={login.isPending}>
        {login.isPending ? 'Signing in…' : 'Sign in'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        New here?{' '}
        <button type="button" onClick={onSwitch} className="font-medium text-primary hover:underline">
          Create an account
        </button>
      </p>
    </form>
  )
}

function RegisterPane({ onAuthenticated, onSwitch }: { onAuthenticated: () => void; onSwitch: () => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormValues>({ resolver: zodResolver(RegisterFormSchema) })
  const signup = useMutation({
    mutationFn: ({ name, email, password }: RegisterFormValues) =>
      apiClient.post<AuthUser>('/api/auth/register', { name, email, password }),
    onSuccess: onAuthenticated,
  })

  return (
    <form onSubmit={handleSubmit((values) => signup.mutate(values))} className="space-y-4" noValidate>
      <div className="space-y-1">
        <h2 className="font-serif text-2xl leading-none tracking-tight">Create your account</h2>
        <p className="text-sm text-muted-foreground">You’ll connect the extension right after.</p>
      </div>
      {signup.error ? <ErrorAlert message={signup.error.message} /> : null}
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" autoComplete="name" {...register('name')} />
        {errors.name ? <p className="text-xs text-destructive">{errors.name.message}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" placeholder="you@example.com" {...register('email')} />
        {errors.email ? <p className="text-xs text-destructive">{errors.email.message}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" autoComplete="new-password" {...register('password')} />
        {errors.password ? <p className="text-xs text-destructive">{errors.password.message}</p> : null}
      </div>
      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirm password</Label>
        <Input id="confirmPassword" type="password" autoComplete="new-password" {...register('confirmPassword')} />
        {errors.confirmPassword ? (
          <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
        ) : null}
      </div>
      <Button type="submit" className="w-full" disabled={signup.isPending}>
        {signup.isPending ? 'Creating…' : 'Create account'}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <button type="button" onClick={onSwitch} className="font-medium text-primary hover:underline">
          Sign in
        </button>
      </p>
    </form>
  )
}
