import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

vi.mock('@/lib/api-client', () => ({
  apiClient: { get: vi.fn(), post: vi.fn(), postForm: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  ApiError: class ApiError extends Error {},
}))

import { apiClient } from '@/lib/api-client'
import { usePersonas, useCreatePersona, useUpdatePersona, useDeletePersona, useParseResume } from './use-personas'
import { PERSONAS_KEY } from '@/lib/query-keys'
import { emptyProfileContent } from '@/lib/profile'

const api = vi.mocked(apiClient)
function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
function spiedClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidate = vi.spyOn(client, 'invalidateQueries')
  const Wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>
  return { Wrapper, invalidate }
}
beforeEach(() => vi.clearAllMocks())

describe('usePersonas', () => {
  it('fetches the list', async () => {
    api.get.mockResolvedValue([{ id: 'p1', name: 'Backend' }])
    const { result } = renderHook(() => usePersonas(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.get).toHaveBeenCalledWith('/api/personas')
    expect(result.current.data).toHaveLength(1)
  })
})

describe('useCreatePersona', () => {
  it('posts { name, data, rawInput } and invalidates the list', async () => {
    api.post.mockResolvedValue({ id: 'p1' })
    const { Wrapper, invalidate } = spiedClient()
    const { result } = renderHook(() => useCreatePersona(), { wrapper: Wrapper })
    const data = emptyProfileContent()
    result.current.mutate({ name: 'Backend', data, rawInput: 'pasted résumé' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.post).toHaveBeenCalledWith('/api/personas', { name: 'Backend', data, rawInput: 'pasted résumé' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: PERSONAS_KEY })
  })
})

describe('useParseResume', () => {
  it('posts a FormData with the file and text fields', async () => {
    api.postForm.mockResolvedValue({ content: emptyProfileContent(), rawText: 'extracted' })
    const { result } = renderHook(() => useParseResume(), { wrapper })
    const file = new File(['%PDF-1.4'], 'resume.pdf', { type: 'application/pdf' })
    result.current.mutate({ text: 'pasted text', file })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.postForm).toHaveBeenCalledOnce()
    const [path, fd] = api.postForm.mock.calls[0] as [string, FormData]
    expect(path).toBe('/api/personas/parse-resume')
    expect(fd).toBeInstanceOf(FormData)
    expect(fd.get('text')).toBe('pasted text')
    expect(fd.get('file')).toBe(file)
    expect(result.current.data?.rawText).toBe('extracted')
  })

  it('omits absent fields from the FormData', async () => {
    api.postForm.mockResolvedValue({ content: emptyProfileContent(), rawText: 'text only' })
    const { result } = renderHook(() => useParseResume(), { wrapper })
    result.current.mutate({ text: 'just pasted text' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const [, fd] = api.postForm.mock.calls[0] as [string, FormData]
    expect(fd.get('text')).toBe('just pasted text')
    expect(fd.has('file')).toBe(false)
  })
})

describe('useUpdatePersona / useDeletePersona', () => {
  it('patches by id', async () => {
    api.patch.mockResolvedValue({ id: 'p1', name: 'X' })
    const { result } = renderHook(() => useUpdatePersona('p1'), { wrapper })
    result.current.mutate({ name: 'X' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.patch).toHaveBeenCalledWith('/api/personas/p1', { name: 'X' })
  })
  it('deletes by id', async () => {
    api.delete.mockResolvedValue(undefined)
    const { result } = renderHook(() => useDeletePersona(), { wrapper })
    result.current.mutate('p1')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(api.delete).toHaveBeenCalledWith('/api/personas/p1')
  })
})
