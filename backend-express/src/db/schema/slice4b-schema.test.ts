import { describe, it, expect } from 'vitest'
import { reminders } from './reminders.js'
import { notifications, NOTIFICATION_TYPES } from './notifications.js'

describe('reminders table', () => {
  it('declares the expected columns', () => {
    const cols = Object.keys(reminders)
    expect(cols).toEqual(
      expect.arrayContaining(['id', 'createdAt', 'updatedAt', 'userId', 'jobId', 'message', 'remindAt', 'isCompleted']),
    )
  })
})

describe('notifications table', () => {
  it('declares the expected columns', () => {
    const cols = Object.keys(notifications)
    expect(cols).toEqual(
      expect.arrayContaining(['id', 'createdAt', 'updatedAt', 'userId', 'message', 'type', 'isRead', 'relatedJobId']),
    )
  })
  it('exposes the 4 notification types', () => {
    expect(NOTIFICATION_TYPES).toEqual(['GHOST_ALERT', 'REMINDER', 'STATUS_CHANGE', 'GENERAL'])
  })
})
