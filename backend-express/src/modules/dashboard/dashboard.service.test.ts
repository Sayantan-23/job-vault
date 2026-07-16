import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('./dashboard.repository.js', () => ({
  dashboardRepository: { findForUser: vi.fn() },
}))
vi.mock('@/modules/contacts/contacts.repository.js', () => ({
  contactsRepository: { countsForJobs: vi.fn() },
}))

import { dashboardRepository } from './dashboard.repository.js'
import { contactsRepository } from '@/modules/contacts/contacts.repository.js'
import { dashboardService } from './dashboard.service.js'
import type { JobRow } from '@/db/schema/jobs.js'

const repo = vi.mocked(dashboardRepository)
const contacts = vi.mocked(contactsRepository)
const day = 86_400_000

function fakeRow(over: Partial<JobRow> = {}): JobRow {
  const now = Date.now()
  return {
    id: 'j' + Math.round(over.kanbanOrder ?? 0),
    createdAt: new Date(now),
    updatedAt: new Date(now),
    userId: 'u1',
    title: 'T',
    company: 'C',
    location: null,
    salaryRange: null,
    sourceUrl: null,
    snapshotMarkdown: null,
    status: 'WISHLIST',
    kanbanOrder: 1,
    lastActivityAt: new Date(now),
    ghostDays: 0,
    notes: null,
    ...over,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  contacts.countsForJobs.mockResolvedValue(new Map())
})

describe('dashboardService.getKanban', () => {
  it('attaches outreach counts to cards, defaulting to zero', async () => {
    repo.findForUser.mockResolvedValue([
      fakeRow({ id: 'j1', status: 'APPLIED', kanbanOrder: 1 }),
      fakeRow({ id: 'j2', status: 'WISHLIST', kanbanOrder: 2 }),
    ])
    contacts.countsForJobs.mockResolvedValue(
      new Map([['j1', { outreachCount: 2, outreachReplies: 2 }]]),
    )
    const board = await dashboardService.getKanban('u1', {})
    const cards = board.columns.flatMap((c) => c.jobs)
    expect(cards.find((c) => c.id === 'j1')).toMatchObject({ outreachCount: 2, outreachReplies: 2 })
    expect(cards.filter((c) => c.id !== 'j1').every((c) => c.outreachCount === 0)).toBe(true)
  })

  it('returns all 6 columns in fixed order, even when empty', async () => {
    repo.findForUser.mockResolvedValue([])
    const board = await dashboardService.getKanban('u1', {})
    expect(board.columns.map((c) => c.status)).toEqual([
      'WISHLIST', 'APPLIED', 'INTERVIEWING', 'OFFER', 'REJECTED', 'ARCHIVED',
    ])
    expect(board.columns.every((c) => c.jobs.length === 0)).toBe(true)
    expect(board.stats.totalJobs).toBe(0)
  })

  it('groups cards by status and derives ghostDays from lastActivityAt', async () => {
    const now = Date.now()
    repo.findForUser.mockResolvedValue([
      fakeRow({ id: 'a', status: 'APPLIED', kanbanOrder: 1, lastActivityAt: new Date(now - 3 * day) }),
      fakeRow({ id: 'b', status: 'APPLIED', kanbanOrder: 2, lastActivityAt: new Date(now - 20 * day) }),
    ])
    const board = await dashboardService.getKanban('u1', {})
    const applied = board.columns.find((c) => c.status === 'APPLIED')
    expect(applied?.jobs.map((j) => j.id)).toEqual(['a', 'b'])
    expect(applied?.jobs[0]?.ghostDays).toBe(3)
    expect(applied?.jobs[1]?.ghostDays).toBe(20)
    expect(board.stats.byStatus.APPLIED).toBe(2)
    expect(board.stats.ghostAlerts).toBe(1) // b is >14
  })

  it('applies the ghostFilter on the derived value', async () => {
    const now = Date.now()
    repo.findForUser.mockResolvedValue([
      fakeRow({ id: 'fresh', status: 'APPLIED', lastActivityAt: new Date(now - 1 * day) }),
      fakeRow({ id: 'old', status: 'APPLIED', lastActivityAt: new Date(now - 30 * day) }),
    ])
    const board = await dashboardService.getKanban('u1', { ghostFilter: 'ghost' })
    const applied = board.columns.find((c) => c.status === 'APPLIED')
    expect(applied?.jobs.map((j) => j.id)).toEqual(['old'])
    expect(board.stats.totalJobs).toBe(1) // stats reflect the filtered set
  })
})

describe('dashboardService.getStats', () => {
  it('computes global stats with derived ghost data', async () => {
    const now = Date.now()
    repo.findForUser.mockResolvedValue([
      fakeRow({ status: 'OFFER', lastActivityAt: new Date(now - 1 * day) }),
      fakeRow({ status: 'OFFER', lastActivityAt: new Date(now - 40 * day) }),
      fakeRow({ status: 'WISHLIST', lastActivityAt: new Date(now) }),
    ])
    const stats = await dashboardService.getStats('u1')
    expect(stats.totalJobs).toBe(3)
    expect(stats.byStatus.OFFER).toBe(2)
    expect(stats.byStatus.WISHLIST).toBe(1)
    expect(stats.ghostAlerts).toBe(1)
    expect(stats.recentActivity).toBe(2) // the two <=7d
    expect(repo.findForUser).toHaveBeenCalledWith('u1', {})
  })
})
