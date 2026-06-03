import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Notification } from '@/types/notification'

// A controllable fake socket: capture the 'notification' handler so the test can fire it.
const handlers: Record<string, (payload: unknown) => void> = {}
const on = vi.fn((event: string, cb: (payload: unknown) => void) => {
  handlers[event] = cb
})
const off = vi.fn()
const connect = vi.fn()
const disconnect = vi.fn()

vi.mock('@/lib/socket', () => ({
  connectSocket: () => {
    connect()
    return { on, off }
  },
  disconnectSocket: () => disconnect(),
  getSocket: () => ({ on, off, connect, disconnect }),
}))

import { RealtimeProvider } from './realtime-provider'
import { NOTIFICATIONS_KEY } from '@/lib/query-keys'

// Concrete builder for a Notification matching the 4b interface shape.
function fakeNotification(over: Partial<Notification> = {}): Notification {
  return {
    id: 'n-id',
    userId: 'u1',
    message: 'msg',
    type: 'REMINDER',
    isRead: false,
    relatedJobId: null,
    createdAt: '2026-06-03T00:00:00.000Z',
    ...over,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  for (const k of Object.keys(handlers)) delete handlers[k]
})

function setup(seed: Notification[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(NOTIFICATIONS_KEY, seed)
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  return { client, Wrapper }
}

function unread(list: Notification[] | undefined): number {
  return (list ?? []).filter((n) => !n.isRead).length
}

describe('RealtimeProvider', () => {
  it('connects the socket on mount and disconnects on unmount', () => {
    const { Wrapper } = setup([fakeNotification({ id: 'n0', isRead: true })])
    const { unmount } = render(
      <Wrapper>
        <RealtimeProvider>
          <span>child</span>
        </RealtimeProvider>
      </Wrapper>,
    )
    expect(connect).toHaveBeenCalledTimes(1)
    unmount()
    expect(disconnect).toHaveBeenCalledTimes(1)
  })

  it('prepends a pushed notification and increments the client-derived unread count', () => {
    const seed = [fakeNotification({ id: 'n0', isRead: true })]
    const { client, Wrapper } = setup(seed)
    render(
      <Wrapper>
        <RealtimeProvider>
          <span>child</span>
        </RealtimeProvider>
      </Wrapper>,
    )
    expect(unread(client.getQueryData<Notification[]>(NOTIFICATIONS_KEY))).toBe(0)
    handlers['notification']?.(fakeNotification({ id: 'n1', isRead: false }))
    const list = client.getQueryData<Notification[]>(NOTIFICATIONS_KEY)
    expect(list?.map((n) => n.id)).toEqual(['n1', 'n0'])
    expect(unread(list)).toBe(1)
  })

  it('dedupes a notification already in the cache', () => {
    const seed = [fakeNotification({ id: 'n0', isRead: false })]
    const { client, Wrapper } = setup(seed)
    render(
      <Wrapper>
        <RealtimeProvider>
          <span>child</span>
        </RealtimeProvider>
      </Wrapper>,
    )
    handlers['notification']?.(fakeNotification({ id: 'n0', isRead: false, message: 'dup' }))
    const list = client.getQueryData<Notification[]>(NOTIFICATIONS_KEY)
    expect(list?.map((n) => n.id)).toEqual(['n0'])
    expect(unread(list)).toBe(1)
  })
})
