// frontend-next/src/lib/profile.test.ts
import { describe, it, expect } from 'vitest'
import { emptyProfileContent, newExperience, newEducation, newProject, newSkillGroup, newLink, validateProfileContent } from './profile'

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
