import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

vi.mock('./push.repository.js', () => ({
  pushRepository: {
    upsert: vi.fn(),
    listForUser: vi.fn(),
    remove: vi.fn(),
    removeTokens: vi.fn(),
  },
}))

import { pushRepository } from './push.repository.js'
import { pushService } from './push.service.js'
import type { DeviceTokenRow } from '@/db/schema/device-tokens.js'

const repo = vi.mocked(pushRepository)

function device(token: string): DeviceTokenRow {
  return { id: token, createdAt: new Date(), updatedAt: new Date(), userId: 'u1', token, platform: 'android' }
}

function mockFetch(body: unknown, ok = true) {
  const fn = vi.fn().mockResolvedValue({ ok, json: async () => body })
  vi.stubGlobal('fetch', fn)
  return fn
}

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.unstubAllGlobals())

describe('pushService.registerDevice', () => {
  it('upserts the token for the caller', async () => {
    repo.upsert.mockResolvedValue(device('ExponentPushToken[a]'))
    const row = await pushService.registerDevice('u1', { token: 'ExponentPushToken[a]', platform: 'android' })
    expect(repo.upsert).toHaveBeenCalledWith({ userId: 'u1', token: 'ExponentPushToken[a]', platform: 'android' })
    expect(row.token).toBe('ExponentPushToken[a]')
  })
})

describe('pushService.unregisterDevice', () => {
  it('resolves when the caller owned the token', async () => {
    repo.remove.mockResolvedValue(true)
    await expect(pushService.unregisterDevice('u1', 'ExponentPushToken[a]')).resolves.toBeUndefined()
  })

  it('throws NOT_FOUND when it did not', async () => {
    repo.remove.mockResolvedValue(false)
    await expect(pushService.unregisterDevice('u1', 'nope')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('pushService.sendToUser', () => {
  it('does not call Expo when the user has no devices', async () => {
    const fetchMock = mockFetch({ data: [] })
    repo.listForUser.mockResolvedValue([])
    await pushService.sendToUser('u1', { title: 'Reminder', body: 'due' })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('posts one message per device with the title, body and data', async () => {
    const fetchMock = mockFetch({ data: [{ status: 'ok', id: '1' }, { status: 'ok', id: '2' }] })
    repo.listForUser.mockResolvedValue([device('ExponentPushToken[a]'), device('ExponentPushToken[b]')])

    await pushService.sendToUser('u1', { title: 'Reminder', body: 'due', data: { jobId: 'j1' } })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(url).toBe('https://exp.host/--/api/v2/push/send')
    expect(init.method).toBe('POST')
    expect(JSON.parse(String(init.body))).toEqual([
      { to: 'ExponentPushToken[a]', sound: 'default', title: 'Reminder', body: 'due', data: { jobId: 'j1' } },
      { to: 'ExponentPushToken[b]', sound: 'default', title: 'Reminder', body: 'due', data: { jobId: 'j1' } },
    ])
    expect(repo.removeTokens).not.toHaveBeenCalled()
  })

  it('prunes only the tokens Expo reports as DeviceNotRegistered', async () => {
    mockFetch({
      data: [
        { status: 'error', message: 'gone', details: { error: 'DeviceNotRegistered' } },
        { status: 'ok', id: '2' },
        { status: 'error', message: 'oops', details: { error: 'MessageTooBig' } },
      ],
    })
    repo.listForUser.mockResolvedValue([device('dead'), device('live'), device('big')])

    await pushService.sendToUser('u1', { title: 'x', body: 'y' })

    expect(repo.removeTokens).toHaveBeenCalledWith(['dead'])
  })

  it('never throws when Expo errors, is unreachable, or answers with junk', async () => {
    repo.listForUser.mockResolvedValue([device('a')])

    mockFetch({ errors: [{ code: 'PUSH_TOO_MANY_EXPERIENCE_IDS' }] }, false)
    await expect(pushService.sendToUser('u1', { title: 'x', body: 'y' })).resolves.toBeUndefined()

    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('ECONNRESET')))
    await expect(pushService.sendToUser('u1', { title: 'x', body: 'y' })).resolves.toBeUndefined()

    mockFetch({ data: 'not-an-array' })
    await expect(pushService.sendToUser('u1', { title: 'x', body: 'y' })).resolves.toBeUndefined()
    expect(repo.removeTokens).not.toHaveBeenCalled()
  })
})
