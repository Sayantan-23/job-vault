import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { getToken, setToken, clearToken, getSettings, setSettings } from './storage'
import { DEFAULT_SERVER_URL } from './types'

let store: Record<string, unknown>
beforeEach(() => {
  store = {}
  const local = {
    get: vi.fn((key: string) => Promise.resolve(key in store ? { [key]: store[key] } : {})),
    set: vi.fn((obj: Record<string, unknown>) => {
      Object.assign(store, obj)
      return Promise.resolve()
    }),
    remove: vi.fn((key: string) => {
      delete store[key]
      return Promise.resolve()
    }),
  }
  vi.stubGlobal('chrome', { storage: { local } })
})
afterEach(() => vi.unstubAllGlobals())

describe('storage', () => {
  it('round-trips the token and clears it', async () => {
    expect(await getToken()).toBeNull()
    await setToken('jv_abc')
    expect(await getToken()).toBe('jv_abc')
    await clearToken()
    expect(await getToken()).toBeNull()
  })
  it('defaults the settings serverUrl and round-trips an override', async () => {
    expect(await getSettings()).toEqual({ serverUrl: DEFAULT_SERVER_URL })
    await setSettings({ serverUrl: 'https://api.example.com' })
    expect(await getSettings()).toEqual({ serverUrl: 'https://api.example.com' })
  })
})
