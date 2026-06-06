import { describe, it, expect } from 'vitest'
import {
  ProfileContentSchema,
  ensureIds,
  emptyProfileContent,
  type ProfileContent,
} from './profile-content.schema.js'

describe('ProfileContentSchema', () => {
  it('accepts a minimal profile and applies array defaults', () => {
    const parsed = ProfileContentSchema.parse({ basics: { name: 'Ada' } })
    expect(parsed.summary).toBe('')
    expect(parsed.experience).toEqual([])
    expect(parsed.basics.links).toEqual([])
  })

  it('accepts partial / AI-shaped data: nullable dates and missing ids', () => {
    const parsed = ProfileContentSchema.parse({
      basics: { name: 'Ada' },
      experience: [{ company: 'X', role: 'SWE' }], // no startDate, no id, no current
      education: [{ degree: 'BS', institution: 'MIT' }],
    })
    expect(parsed.experience[0]?.startDate).toBeNull()
    expect(parsed.experience[0]?.current).toBe(false)
    expect(parsed.experience[0]?.id).toBeUndefined()
  })

  it('accepts a year-only date (month null) and a full date', () => {
    const parsed = ProfileContentSchema.parse({
      basics: { name: 'Ada' },
      experience: [{ company: 'X', role: 'SWE', startDate: { year: 2022 }, endDate: { month: 6, year: 2024 } }],
    })
    expect(parsed.experience[0]?.startDate).toEqual({ month: null, year: 2022 })
    expect(parsed.experience[0]?.endDate).toEqual({ month: 6, year: 2024 })
  })

  it('rejects a required entry field (empty company)', () => {
    expect(() => ProfileContentSchema.parse({ basics: { name: 'Ada' }, experience: [{ company: '', role: 'SWE' }] })).toThrow()
  })

  it('rejects an invalid month', () => {
    expect(() =>
      ProfileContentSchema.parse({ basics: { name: 'Ada' }, experience: [{ company: 'X', role: 'SWE', startDate: { month: 13, year: 2022 } }] }),
    ).toThrow()
  })
})

describe('ensureIds', () => {
  it('assigns ids to every entry and link missing one, leaving existing ids', () => {
    const input: ProfileContent = ProfileContentSchema.parse({
      basics: { name: 'Ada', links: [{ label: 'GH', url: 'gh' }, { id: 'keep', label: 'LI', url: 'li' }] },
      experience: [{ company: 'X', role: 'SWE' }],
      projects: [{ name: 'P', links: [{ label: 'Demo', url: 'd' }] }],
      skills: [{ category: 'Skills', items: ['ts'] }],
      education: [{ degree: 'BS', institution: 'MIT' }],
    })
    const out = ensureIds(input)
    expect(out.basics.links[0]?.id).toBeTruthy()
    expect(out.basics.links[1]?.id).toBe('keep')
    expect(out.experience[0]?.id).toBeTruthy()
    expect(out.projects[0]?.id).toBeTruthy()
    expect(out.projects[0]?.links[0]?.id).toBeTruthy()
    expect(out.skills[0]?.id).toBeTruthy()
    expect(out.education[0]?.id).toBeTruthy()
  })
})

describe('emptyProfileContent', () => {
  it('returns an empty profile shell', () => {
    const e = emptyProfileContent()
    expect(e.basics.name).toBe('')
    expect(e.experience).toEqual([])
  })
})
