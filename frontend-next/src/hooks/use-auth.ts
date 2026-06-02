'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { apiClient } from '@/lib/api-client'
import type { AuthUser } from '@/types/auth'
import type { LoginValues, RegisterValues } from '@/schemas/auth'

const CURRENT_USER_KEY = ['currentUser'] as const

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
      router.push('/app/dashboard')
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
      router.push('/app/dashboard')
    },
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
