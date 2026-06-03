import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./notifications.repository.js', () => ({
  notificationsRepository: {
    create: vi.fn(),
    list: vi.fn(),
    findById: vi.fn(),
    markRead: vi.fn(),
    markAllRead: vi.fn(),
  },
}))

vi.mock('@/realtime/socket.js', () => ({ emitToUser: vi.fn() }))

import { notificationsRepository } from './notifications.repository.js'
import { notificationsService } from './notifications.service.js'
import { emitToUser } from '@/realtime/socket.js'
import type { NotificationRow } from '@/db/schema/notifications.js'

const repo = vi.mocked(notificationsRepository)
const emit = vi.mocked(emitToUser)

function fakeNotification(over: Partial<NotificationRow> = {}): NotificationRow {
  return {
    id: 'n1',
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: 'u1',
    message: 'hi',
    type: 'REMINDER',
    isRead: false,
    relatedJobId: null,
    ...over,
  }
}

beforeEach(() => vi.clearAllMocks())

describe('notificationsService.create', () => {
  it('forwards to the repo with the related job when present and returns the created row', async () => {
    repo.create.mockResolvedValue(fakeNotification({ relatedJobId: 'j1' }))
    const created = await notificationsService.create({ userId: 'u1', message: 'hi', type: 'REMINDER', relatedJobId: 'j1' })
    expect(repo.create).toHaveBeenCalledWith({ userId: 'u1', message: 'hi', type: 'REMINDER', relatedJobId: 'j1' })
    expect(created.relatedJobId).toBe('j1')
  })

  it('omits relatedJobId when not given', async () => {
    repo.create.mockResolvedValue(fakeNotification())
    await notificationsService.create({ userId: 'u1', message: 'hi', type: 'GENERAL' })
    expect(repo.create).toHaveBeenCalledWith({ userId: 'u1', message: 'hi', type: 'GENERAL' })
  })
})

describe('notificationsService.markRead', () => {
  it('returns the updated notification', async () => {
    repo.markRead.mockResolvedValue(fakeNotification({ isRead: true }))
    const result = await notificationsService.markRead('u1', 'n1')
    expect(result.isRead).toBe(true)
  })

  it('throws NOT_FOUND when missing', async () => {
    repo.markRead.mockResolvedValue(null)
    await expect(notificationsService.markRead('u1', 'missing')).rejects.toMatchObject({ code: 'NOT_FOUND' })
  })
})

describe('notificationsService.markAllRead', () => {
  it('returns the updated count', async () => {
    repo.markAllRead.mockResolvedValue(3)
    expect(await notificationsService.markAllRead('u1')).toEqual({ updated: 3 })
  })
})

describe('notificationsService.list', () => {
  it('passes unreadOnly through', async () => {
    repo.list.mockResolvedValue([fakeNotification()])
    await notificationsService.list('u1', true)
    expect(repo.list).toHaveBeenCalledWith('u1', true)
  })
})

describe('notificationsService.create emits over socket.io', () => {
  it('pushes the persisted notification to the owner after saving', async () => {
    const created = fakeNotification({ id: 'n1', userId: 'u1', message: 'due', type: 'REMINDER' })
    repo.create.mockResolvedValue(created)
    const result = await notificationsService.create({ userId: 'u1', message: 'due', type: 'REMINDER' })
    expect(result.id).toBe('n1')
    expect(emit).toHaveBeenCalledWith('u1', 'notification', created)
  })

  it('still resolves when realtime is a no-op (emit never throws)', async () => {
    const created = fakeNotification({ id: 'n2', userId: 'u1' })
    repo.create.mockResolvedValue(created)
    emit.mockImplementation(() => {})
    await expect(
      notificationsService.create({ userId: 'u1', message: 'x', type: 'GENERAL' }),
    ).resolves.toMatchObject({ id: 'n2' })
  })
})
