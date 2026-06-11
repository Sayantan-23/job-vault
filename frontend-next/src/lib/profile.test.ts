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
