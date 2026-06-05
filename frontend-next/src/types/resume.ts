export interface ResumeLink {
  label: string
  url: string
}
export interface ResumeBasics {
  name: string
  phone?: string
  email?: string
  location?: string
  links: ResumeLink[]
}
export interface ResumeExperience {
  company: string
  title: string
  date: string
  bullets: string[]
}
export interface ResumeProject {
  name: string
  tagline?: string
  url?: string
  bullets: string[]
}
export interface ResumeSkillGroup {
  category: string
  items: string[]
}
export interface ResumeEducation {
  degree: string
  institution: string
  period?: string
}
export interface ResumeContent {
  basics: ResumeBasics
  summary: string
  experience: ResumeExperience[]
  projects: ResumeProject[]
  skills: ResumeSkillGroup[]
  education: ResumeEducation[]
}
export interface GeneratedResume {
  id: string
  createdAt: string
  updatedAt: string
  userId: string
  personaId: string
  jobId: string | null
  title: string | null
  instructions: string | null
  content: ResumeContent
}
