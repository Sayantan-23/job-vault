import { JOB_STATUSES, STATUS_META, type JobStatus } from './job-status'

describe('job-status', () => {
  it('exposes the six pipeline statuses in order', () => {
    expect(JOB_STATUSES).toEqual([
      'WISHLIST',
      'APPLIED',
      'INTERVIEWING',
      'OFFER',
      'REJECTED',
      'ARCHIVED',
    ])
  })

  it('has a StatusMeta entry for every status', () => {
    for (const status of JOB_STATUSES) {
      const meta = STATUS_META[status as JobStatus]
      expect(meta).toBeDefined()
      expect(meta.label.length).toBeGreaterThan(0)
      // Non-empty className — NativeWind renders these (verified: `/10` opacity
      // and `opacity-70` are used by the existing mobile primitives).
      expect(meta.className.length).toBeGreaterThan(0)
    }
  })
})
