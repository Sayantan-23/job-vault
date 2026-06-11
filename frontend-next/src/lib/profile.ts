// frontend-next/src/lib/profile.ts
import type {
  MonthYear,
  ProfileContent,
  ProfileExperience,
  ProfileProject,
  ProfileSkillGroup,
  ProfileEducation,
  ProfileLink,
} from '@/types/profile'

// Prefer crypto.randomUUID when available; fall back to a non-crypto random id
// (e.g. in test/jsdom environments where crypto.randomUUID may be undefined).
export const newId = (): string => {
  const uuid = globalThis.crypto?.randomUUID?.()
  if (uuid) return uuid
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export const emptyProfileContent = (): ProfileContent => ({
  basics: { name: '', email: '', phone: '', location: '', links: [] },
  summary: '',
  experience: [],
  projects: [],
  skills: [],
  education: [],
})

export const newLink = (): ProfileLink => ({ id: newId(), label: '', url: '' })
export const newExperience = (): ProfileExperience => ({
  id: newId(),
  company: '',
  role: '',
  startDate: null,
  endDate: null,
  current: false,
  bullets: [],
})
export const newProject = (): ProfileProject => ({
  id: newId(),
  name: '',
  technologies: [],
  bullets: [],
  links: [],
  startDate: null,
  endDate: null,
  inProgress: false,
})
export const newSkillGroup = (): ProfileSkillGroup => ({ id: newId(), category: 'Skills', items: [] })
export const newEducation = (): ProfileEducation => ({
  id: newId(),
  degree: '',
  institution: '',
  startDate: null,
  endDate: null,
  current: false,
  bullets: [],
})

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const formatMonthYear = (d: MonthYear | null): string => {
  if (!d) return ''
  const month = d.month ? MONTH_LABELS[d.month - 1] : undefined
  return month ? `${month} ${d.year}` : String(d.year)
}

// "Jan 2022 – Present", "2019 – 2021", "Mar 2022" (no end), "" (no dates).
export function formatMonthYearRange(
  startDate: MonthYear | null,
  endDate: MonthYear | null,
  current: boolean,
): string {
  const start = formatMonthYear(startDate)
  const end = current ? 'Present' : formatMonthYear(endDate)
  return [start, end].filter(Boolean).join(' – ')
}

// Mirrors the backend's min(1) requirements plus form-level date requiredness
// (experience: start + end-unless-current; education: start + end-unless-current).
export function validateProfileContent(c: ProfileContent): string[] {
  const errors: string[] = []
  if (!c.basics.name.trim()) errors.push('Your name is required')

  c.experience.forEach((e, i) => {
    const tag = `Experience ${i + 1}`
    if (!e.company.trim()) errors.push(`${tag}: company is required`)
    if (!e.role.trim()) errors.push(`${tag}: role is required`)
    if (!e.startDate?.year) errors.push(`${tag}: start date is required`)
    if (!e.current && !e.endDate?.year) errors.push(`${tag}: end date is required (or mark “current”)`)
  })

  c.education.forEach((e, i) => {
    const tag = `Education ${i + 1}`
    if (!e.degree.trim()) errors.push(`${tag}: degree is required`)
    if (!e.institution.trim()) errors.push(`${tag}: institution is required`)
    if (!e.startDate?.year) errors.push(`${tag}: start date is required`)
    if (!e.current && !e.endDate?.year) errors.push(`${tag}: end date is required (or mark “current”)`)
  })

  c.projects.forEach((p, i) => {
    if (!p.name.trim()) errors.push(`Project ${i + 1}: name is required`)
  })

  return errors
}
