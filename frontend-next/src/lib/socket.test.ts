import { describe, it, expect, vi, beforeEach } from 'vitest'

const connect = vi.fn()
const disconnect = vi.fn()
const fakeSocket = { connect, disconnect, on: vi.fn(), off: vi.fn() }
const ioFactory = vi.fn(() => fakeSocket)

vi.mock('socket.io-client', () => ({ io: (...args: unknown[]) => (ioFactory as (...a: unknown[]) => typeof fakeSocket)(...args) }))

beforeEach(() => {
  vi.clearAllMocks()
  vi.resetModules()
})

describe('getSocket', () => {
  it('lazily creates one socket and reuses it', async () => {
    const { getSocket } = await import('./socket')
    const a = getSocket()
    const b = getSocket()
    expect(a).toBe(b)
    expect(ioFactory).toHaveBeenCalledTimes(1)
  })

  it('configures same-origin connection with autoConnect off and both transports', async () => {
    const { getSocket } = await import('./socket')
    getSocket()
    const opts = (ioFactory.mock.calls[0] as unknown as [unknown, Record<string, unknown>])[1]
    expect(opts).toMatchObject({
      path: '/socket.io',
      withCredentials: true,
      autoConnect: false,
      transports: ['websocket', 'polling'],
    })
  })
})

describe('connectSocket / disconnectSocket', () => {
  it('connects and disconnects the singleton', async () => {
    const { connectSocket, disconnectSocket } = await import('./socket')
    connectSocket()
    disconnectSocket()
    expect(connect).toHaveBeenCalledTimes(1)
    expect(disconnect).toHaveBeenCalledTimes(1)
  })
})
