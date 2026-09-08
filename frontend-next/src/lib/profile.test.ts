// frontend-next/src/lib/profile.test.ts
import { describe, it, expect } from 'vitest'
import {
  emptyProfileContent,
  newExperience,
  newEducation,
  newProject,
  newSkillGroup,
  newLink,
  validateProfileContent,
  formatMonthYearRange,
  ensureProfileIds,
  reconcilePersonaWithProfile,
} from './profile'

describe('profile factories', () => {
  it('emptyProfileContent has empty sections and a blank name', () => {
    const e = emptyProfileContent()
    expect(e.basics.name).toBe('')
    expect(e.experience).toEqual([])
  })
  it('factories produce unique ids', () => {
    expect(newExperience().id).not.toBe(newExperience().id)
    expect(newLink().id).toBeTruthy()
    expect(newProject().id).toBeTruthy()
    expect(newSkillGroup().category).toBe('Skills')
    expect(newEducation().id).toBeTruthy()
  })
})

describe('validateProfileContent', () => {
  it('passes for a complete profile', () => {
    const c = emptyProfileContent()
    c.basics.name = 'Ada'
    c.experience = [{ ...newExperience(), company: 'X', role: 'SWE', startDate: { month: 1, year: 2022 }, current: true }]
    c.education = [{ ...newEducation(), degree: 'BS', institution: 'MIT', startDate: { month: null, year: 2018 }, endDate: { month: null, year: 2022 } }]
    expect(validateProfileContent(c)).toEqual([])
  })
  it('flags a blank name', () => {
    expect(validateProfileContent(emptyProfileContent())).toContain('Your name is required')
  })
  it('flags experience missing company/role/start date', () => {
    const c = emptyProfileContent()
    c.basics.name = 'Ada'
    c.experience = [newExperience()]
    const errs = validateProfileContent(c)
    expect(errs.some((e) => e.includes('Experience 1'))).toBe(true)
  })
  it('requires an experience end date unless current', () => {
    const c = emptyProfileContent()
    c.basics.name = 'Ada'
    c.experience = [{ ...newExperience(), company: 'X', role: 'SWE', startDate: { month: 1, year: 2022 }, current: false, endDate: null }]
    expect(validateProfileContent(c).some((e) => e.includes('end date'))).toBe(true)
  })

  describe('education date requiredness (requireEducationDates option)', () => {
    const datelessEducation = () => {
      const c = emptyProfileContent()
      c.basics.name = 'Ada'
      c.education = [{ ...newEducation(), degree: 'BS', institution: 'MIT', startDate: null, endDate: null, current: false }]
      return c
    }

    it('flags missing education dates by default', () => {
      const errs = validateProfileContent(datelessEducation())
      expect(errs).toContain('Education 1: start date is required')
      expect(errs.some((e) => e.includes('Education 1') && e.includes('end date'))).toBe(true)
    })

    it('accepts dateless education when requireEducationDates is false (imported/legacy entries)', () => {
      expect(validateProfileContent(datelessEducation(), { requireEducationDates: false })).toEqual([])
    })

    it('still requires degree and institution when requireEducationDates is false', () => {
      const c = emptyProfileContent()
      c.basics.name = 'Ada'
      c.education = [{ ...newEducation(), degree: '', institution: '', startDate: null, endDate: null }]
      const errs = validateProfileContent(c, { requireEducationDates: false })
      expect(errs).toContain('Education 1: degree is required')
      expect(errs).toContain('Education 1: institution is required')
      expect(errs.some((e) => e.includes('date'))).toBe(false)
    })
  })

  describe('link requiredness (mirrors backend ProfileLinkSchema min(1))', () => {
    it('flags an empty basics link row', () => {
      const c = emptyProfileContent()
      c.basics.name = 'Ada'
      c.basics.links = [newLink()]
      const errs = validateProfileContent(c)
      expect(errs).toContain('Link 1: label is required')
      expect(errs).toContain('Link 1: URL is required')
    })

    it('flags a half-filled basics link row (label set, URL blank)', () => {
      const c = emptyProfileContent()
      c.basics.name = 'Ada'
      c.basics.links = [{ ...newLink(), label: 'GitHub', url: '' }]
      const errs = validateProfileContent(c)
      expect(errs).not.toContain('Link 1: label is required')
      expect(errs).toContain('Link 1: URL is required')
    })

    it('flags empty project link rows with the project context', () => {
      const c = emptyProfileContent()
      c.basics.name = 'Ada'
      c.projects = [{ ...newProject(), name: 'JobVault', links: [{ ...newLink(), label: '', url: 'https://x.dev' }] }]
      const errs = validateProfileContent(c)
      expect(errs).toContain('Project 1, link 1: label is required')
      expect(errs).not.toContain('Project 1, link 1: URL is required')
    })

    it('passes when all links are filled in', () => {
      const c = emptyProfileContent()
      c.basics.name = 'Ada'
      c.basics.links = [{ ...newLink(), label: 'GitHub', url: 'https://github.com/ada' }]
      c.projects = [{ ...newProject(), name: 'JobVault', links: [{ ...newLink(), label: 'Repo', url: 'https://x.dev' }] }]
      expect(validateProfileContent(c)).toEqual([])
    })
  })
})

describe('formatMonthYearRange', () => {
  it('formats a current range as "Mon YYYY – Present"', () => {
    expect(formatMonthYearRange({ month: 1, year: 2022 }, null, true)).toBe('Jan 2022 – Present')
  })
  it('formats year-only sides', () => {
    expect(formatMonthYearRange({ month: null, year: 2019 }, { month: null, year: 2021 }, false)).toBe('2019 – 2021')
  })
  it('formats full month+year on both sides', () => {
    expect(formatMonthYearRange({ month: 6, year: 2021 }, { month: 8, year: 2021 }, false)).toBe('Jun 2021 – Aug 2021')
  })
  it('returns the start alone when there is no end and not current', () => {
    expect(formatMonthYearRange({ month: 3, year: 2022 }, null, false)).toBe('Mar 2022')
  })
  it('returns an empty string when both sides are null', () => {
    expect(formatMonthYearRange(null, null, false)).toBe('')
  })
})

describe('ensureProfileIds', () => {
  it('assigns ids to any section item or link that lacks one', () => {
    const raw = emptyProfileContent()
    raw.basics.links = [{ label: 'GH', url: 'https://github.com' }]
    raw.experience = [{ company: 'Stripe', role: 'SWE', startDate: null, endDate: null, current: true, bullets: [] }]
    raw.projects = [{ name: 'JobVault', technologies: [], bullets: [], links: [{ label: 'Repo', url: 'https://x.dev' }], startDate: null, endDate: null, inProgress: true }]
    raw.skills = [{ category: 'Languages', items: ['TS'] }]
    raw.education = [{ degree: 'BS', institution: 'MIT', startDate: null, endDate: null, current: false, bullets: [] }]

    const ensured = ensureProfileIds(raw)
    expect(ensured.basics.links[0]?.id).toBeTruthy()
    expect(ensured.experience[0]?.id).toBeTruthy()
    expect(ensured.projects[0]?.id).toBeTruthy()
    expect(ensured.projects[0]?.links[0]?.id).toBeTruthy()
    expect(ensured.skills[0]?.id).toBeTruthy()
    expect(ensured.education[0]?.id).toBeTruthy()
  })

  it('preserves existing ids', () => {
    const raw = emptyProfileContent()
    raw.experience = [{ id: 'custom-exp-id', company: 'Stripe', role: 'SWE', startDate: null, endDate: null, current: true, bullets: [] }]
    const ensured = ensureProfileIds(raw)
    expect(ensured.experience[0]?.id).toBe('custom-exp-id')
  })
})

describe('reconcilePersonaWithProfile', () => {
  it('aligns draft item ids to master profile item ids matching by content', () => {
    const profile = emptyProfileContent()
    profile.experience = [
      { id: 'exp-master-1', company: 'Northwind Software', role: 'Senior Software Engineer', startDate: null, endDate: null, current: true, bullets: [] },
      { id: 'exp-master-2', company: 'Bright Harbor', role: 'Software Engineer', startDate: null, endDate: null, current: false, bullets: [] },
    ]
    profile.projects = [
      { id: 'proj-master-1', name: 'JobVault', technologies: [], bullets: [], links: [], startDate: null, endDate: null, inProgress: true },
    ]
    profile.skills = [
      { id: 'skill-master-1', category: 'Frontend', items: ['React'] },
    ]
    profile.education = [
      { id: 'edu-master-1', degree: 'B.S. CS', institution: 'UT Austin', startDate: null, endDate: null, current: false, bullets: [] },
    ]

    // Persona draft that has matching items with no ID or different random IDs
    const draft = emptyProfileContent()
    draft.experience = [
      { company: 'Northwind Software', role: 'Senior Software Engineer', startDate: null, endDate: null, current: true, bullets: ['Custom bullet'] },
      { id: 'random-uuid', company: 'Bright Harbor', role: 'Software Engineer', startDate: null, endDate: null, current: false, bullets: [] },
    ]
    draft.projects = [
      { name: 'JobVault', technologies: [], bullets: [], links: [], startDate: null, endDate: null, inProgress: true },
    ]
    draft.skills = [
      { id: 'different-id', category: 'Frontend', items: ['React', 'Next.js'] },
    ]
    draft.education = [
      { degree: 'B.S. CS', institution: 'UT Austin', startDate: null, endDate: null, current: false, bullets: [] },
    ]

    const reconciled = reconcilePersonaWithProfile(draft, profile)
    expect(reconciled.experience[0]?.id).toBe('exp-master-1')
    expect(reconciled.experience[0]?.bullets).toEqual(['Custom bullet']) // preserves tailored edits
    expect(reconciled.experience[1]?.id).toBe('exp-master-2')
    expect(reconciled.projects[0]?.id).toBe('proj-master-1')
    expect(reconciled.skills[0]?.id).toBe('skill-master-1')
    expect(reconciled.skills[0]?.items).toEqual(['React', 'Next.js']) // preserves tailored skills
    expect(reconciled.education[0]?.id).toBe('edu-master-1')
  })
})

