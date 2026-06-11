import { randomUUID } from 'node:crypto'
import { z } from 'zod'

export const MonthYearSchema = z.object({
  month: z.number().int().min(1).max(12).nullable().default(null),
  year: z.number().int().min(1900).max(2100),
})

export const ProfileLinkSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  url: z.string().min(1),
})

export const ProfileBasicsSchema = z.object({
  name: z.string().min(1),
  email: z.string().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  links: z.array(ProfileLinkSchema).default([]),
})

export const EmploymentTypeSchema = z.enum([
  'full-time',
  'part-time',
  'contract',
  'freelance',
  'internship',
  'self-employed',
])

export const ProfileExperienceSchema = z.object({
  id: z.string().optional(),
  company: z.string().min(1),
  role: z.string().min(1),
  employmentType: EmploymentTypeSchema.optional(),
  location: z.string().optional(),
  startDate: MonthYearSchema.nullable().default(null),
  endDate: MonthYearSchema.nullable().default(null),
  current: z.boolean().default(false),
  bullets: z.array(z.string()).default([]),
})

export const ProfileProjectSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  role: z.string().optional(),
  description: z.string().optional(),
  technologies: z.array(z.string()).default([]),
  bullets: z.array(z.string()).default([]),
  links: z.array(ProfileLinkSchema).default([]),
  startDate: MonthYearSchema.nullable().default(null),
  endDate: MonthYearSchema.nullable().default(null),
  inProgress: z.boolean().default(false),
})

export const ProfileSkillGroupSchema = z.object({
  id: z.string().optional(),
  category: z.string().default('Skills'),
  items: z.array(z.string()).default([]),
})

export const ProfileEducationSchema = z.object({
  id: z.string().optional(),
  degree: z.string().min(1),
  institution: z.string().min(1),
  fieldOfStudy: z.string().optional(),
  location: z.string().optional(),
  startDate: MonthYearSchema.nullable().default(null),
  endDate: MonthYearSchema.nullable().default(null),
  current: z.boolean().default(false),
  grade: z.string().optional(),
  bullets: z.array(z.string()).default([]),
})

export const ProfileContentSchema = z.object({
  basics: ProfileBasicsSchema,
  summary: z.string().default(''),
  experience: z.array(ProfileExperienceSchema).default([]),
  projects: z.array(ProfileProjectSchema).default([]),
  skills: z.array(ProfileSkillGroupSchema).default([]),
  education: z.array(ProfileEducationSchema).default([]),
})

export type MonthYear = z.infer<typeof MonthYearSchema>
export type ProfileLink = z.infer<typeof ProfileLinkSchema>
export type ProfileBasics = z.infer<typeof ProfileBasicsSchema>
export type ProfileExperience = z.infer<typeof ProfileExperienceSchema>
export type ProfileProject = z.infer<typeof ProfileProjectSchema>
export type ProfileSkillGroup = z.infer<typeof ProfileSkillGroupSchema>
export type ProfileEducation = z.infer<typeof ProfileEducationSchema>
export type ProfileContent = z.infer<typeof ProfileContentSchema>

// Assign a stable id to every entry/link that lacks one. The AI and legacy
// rows never carry ids; the editor relies on them. Pure — returns a new object.
export function ensureIds(content: ProfileContent): ProfileContent {
  const withId = <T extends { id?: string | undefined }>(x: T): T => (x.id ? x : { ...x, id: randomUUID() })
  return {
    ...content,
    basics: { ...content.basics, links: content.basics.links.map(withId) },
    experience: content.experience.map(withId),
    projects: content.projects.map((p) => ({ ...withId(p), links: p.links.map(withId) })),
    skills: content.skills.map(withId),
    education: content.education.map(withId),
  }
}

// A fresh, empty profile shell returned by GET when none is saved yet (not persisted).
export function emptyProfileContent(): ProfileContent {
  return { basics: { name: '', links: [] }, summary: '', experience: [], projects: [], skills: [], education: [] }
}
