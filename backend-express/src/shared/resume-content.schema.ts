import { z } from 'zod'

export const ResumeLinkSchema = z.object({
  label: z.string().min(1),
  url: z.string().min(1),
})

export const ResumeBasicsSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  email: z.string().optional(),
  location: z.string().optional(),
  links: z.array(ResumeLinkSchema).default([]),
})

export const ResumeExperienceSchema = z.object({
  company: z.string().min(1),
  title: z.string().min(1),
  date: z.string().min(1),
  bullets: z.array(z.string()).default([]),
})

export const ResumeProjectSchema = z.object({
  name: z.string().min(1),
  tagline: z.string().optional(),
  url: z.string().optional(),
  bullets: z.array(z.string()).default([]),
})

export const ResumeSkillGroupSchema = z.object({
  category: z.string().min(1),
  items: z.array(z.string()).default([]),
})

export const ResumeEducationSchema = z.object({
  degree: z.string().min(1),
  institution: z.string().min(1),
  period: z.string().optional(),
})

export const ResumeContentSchema = z.object({
  basics: ResumeBasicsSchema,
  summary: z.string().default(''),
  experience: z.array(ResumeExperienceSchema).default([]),
  projects: z.array(ResumeProjectSchema).default([]),
  skills: z.array(ResumeSkillGroupSchema).default([]),
  education: z.array(ResumeEducationSchema).default([]),
})

export type ResumeContent = z.infer<typeof ResumeContentSchema>
