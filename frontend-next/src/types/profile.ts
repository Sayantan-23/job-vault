// frontend-next/src/types/profile.ts
// Mirror of backend ProfileContent (kept in sync manually, like types/resume.ts).
export interface MonthYear {
  month: number | null
  year: number
}
export interface ProfileLink {
  id?: string
  label: string
  url: string
}
export interface ProfileBasics {
  name: string
  email?: string
  phone?: string
  location?: string
  links: ProfileLink[]
}
export type EmploymentType =
  | 'full-time'
  | 'part-time'
  | 'contract'
  | 'freelance'
  | 'internship'
  | 'self-employed'
export interface ProfileExperience {
  id?: string
  company: string
  role: string
  employmentType?: EmploymentType
  location?: string
  startDate: MonthYear | null
  endDate: MonthYear | null
  current: boolean
  bullets: string[]
}
export interface ProfileProject {
  id?: string
  name: string
  role?: string
  description?: string
  technologies: string[]
  bullets: string[]
  links: ProfileLink[]
  startDate: MonthYear | null
  endDate: MonthYear | null
  inProgress: boolean
}
export interface ProfileSkillGroup {
  id?: string
  category: string
  items: string[]
}
export interface ProfileEducation {
  id?: string
  degree: string
  institution: string
  fieldOfStudy?: string
  location?: string
  startDate: MonthYear | null
  endDate: MonthYear | null
  current: boolean
  grade?: string
  bullets: string[]
}
export interface ProfileContent {
  basics: ProfileBasics
  summary: string
  experience: ProfileExperience[]
  projects: ProfileProject[]
  skills: ProfileSkillGroup[]
  education: ProfileEducation[]
}
