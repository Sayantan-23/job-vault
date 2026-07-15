'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import { safeNextPath } from '@/lib/auth-gate'
import type { AuthUser } from '@/types/auth'
import type { LoginValues, RegisterValues } from '@/schemas/auth'

const CURRENT_USER_KEY = ['currentUser'] as const

// Where to land after login/register: the validated ?next= the middleware
// attached when it bounced a logged-out /app/* visit here, else the app home.
// Read from window at success time (not useSearchParams) so the auth pages
// stay static — onSuccess only ever runs in the browser.
function postAuthDestination(): string {
  return safeNextPath(new URLSearchParams(window.location.search).get('next')) ?? '/app/jobs'
}

export function useCurrentUser() {
  return useQuery({
    queryKey: CURRENT_USER_KEY,
    queryFn: () => apiClient.get<AuthUser>('/api/auth/me'),
    retry: false,
  })
}

export function useLogin() {
  const qc = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: (values: LoginValues) => apiClient.post<AuthUser>('/api/auth/login', values),
    onSuccess: (user) => {
      qc.setQueryData(CURRENT_USER_KEY, user)
      router.push(postAuthDestination())
    },
  })
}

export function useRegister() {
  const qc = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: (values: RegisterValues) => apiClient.post<AuthUser>('/api/auth/register', values),
    onSuccess: (user) => {
      qc.setQueryData(CURRENT_USER_KEY, user)
      router.push(postAuthDestination())
    },
  })
}

// Like useCurrentUser, but safe for PUBLIC pages (e.g. /extension/authorize):
// a raw fetch that resolves to null when logged out, instead of letting
// api-client force a redirect to /login on an unrecoverable 401. Its own query
// key keeps it isolated from the app-shell's current-user cache.
export function useOptionalCurrentUser() {
  return useQuery({
    queryKey: ['optionalCurrentUser'],
    queryFn: async (): Promise<AuthUser | null> => {
      const fetchMe = () =>
        fetch('/api/auth/me', { credentials: 'include', headers: { accept: 'application/json' } })
      let res = await fetchMe()
      // This page is public, so neither the rotation middleware nor api-client's
      // silent refresh runs here. Recover an idle-but-valid session (expired
      // access cookie, live refresh cookie) once before falling back to the form.
      if (res.status === 401) {
        const refreshed = await fetch('/api/auth/refresh', {
          method: 'POST',
          credentials: 'include',
          headers: { accept: 'application/json' },
        })
        if (refreshed.ok) res = await fetchMe()
      }
      if (!res.ok) return null
      const payload = (await res.json()) as { data: AuthUser }
      return payload.data
    },
    retry: false,
  })
}

export function useLogout() {
  const qc = useQueryClient()
  const router = useRouter()
  return useMutation({
    mutationFn: () => apiClient.post<{ message: string }>('/api/auth/logout'),
    onSuccess: () => {
      qc.setQueryData(CURRENT_USER_KEY, null)
      qc.clear()
      router.push('/login')
    },
  })
}
