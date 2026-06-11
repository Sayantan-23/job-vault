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
