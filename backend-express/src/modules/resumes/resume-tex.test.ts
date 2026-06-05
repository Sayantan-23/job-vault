import { describe, it, expect } from 'vitest'
import { renderResumeTex } from './resume-tex.js'
import type { ResumeContent } from '@/shared/resume-content.schema.js'

const CONTENT: ResumeContent = {
  basics: { name: 'Kartick Sadhu', email: 'k@example.com', phone: '+91 1', location: 'Kolkata', links: [{ label: 'GitHub', url: 'github.com/x' }] },
  summary: 'Backend engineer with **2 years** & strong CI/CD.',
  experience: [{ company: 'Weloin', title: 'SWE', date: 'Jan 2024 - present', bullets: ['Built **CI/CD** for 100% uptime'] }],
  projects: [{ name: 'MaxFlow', tagline: 'Workflow SaaS', bullets: ['NATS JetStream'] }],
  skills: [{ category: 'Languages', items: ['TypeScript', 'Java'] }],
  education: [{ degree: 'MCA', institution: 'Brainware University', period: '2022-2024' }],
}

describe('renderResumeTex', () => {
  const tex = renderResumeTex(CONTENT)
  it('emits a complete, compilable document skeleton', () => {
    expect(tex).toContain('\\documentclass[a4paper,10pt]{article}')
    expect(tex).toContain('\\begin{document}')
    expect(tex).toContain('\\end{document}')
    expect(tex).toContain('\\pagestyle{empty}')
  })
  it('renders name, sections and entries', () => {
    expect(tex).toContain('Kartick Sadhu')
    expect(tex).toContain('\\section{Professional Summary}')
    expect(tex).toContain('\\section{Experience}')
    expect(tex).toContain('\\textbf{Weloin}')
    expect(tex).toContain('Jan 2024 - present')
    expect(tex).toContain('\\section{Projects}')
    expect(tex).toContain('\\textit{Workflow SaaS}')
    expect(tex).toContain('\\section{Skills}')
    expect(tex).toContain('\\textbf{Languages:} TypeScript, Java')
    expect(tex).toContain('\\section{Education}')
    expect(tex).toContain('\\textbf{MCA,} Brainware University (2022-2024)')
  })
  it('LaTeX-escapes special chars and expands **bold**', () => {
    expect(tex).toContain('Backend engineer with \\textbf{2 years} \\& strong CI/CD.')
    expect(tex).toContain('Built \\textbf{CI/CD} for 100\\% uptime')
  })
  it('links use \\href and email is a mailto', () => {
    expect(tex).toContain('\\href{mailto:k@example.com}{k@example.com}')
    expect(tex).toContain('\\href{https://github.com/x}{github.com/x}')
  })
  it('escapes LaTeX specials inside \\href URL args and a backslash in text (no double-escape)', () => {
    const t = renderResumeTex({
      ...CONTENT,
      basics: { ...CONTENT.basics, email: 'a%b@c_d.com', links: [{ label: 'GH', url: 'github.com/u#r&v' }] },
      summary: 'path C:\\temp and 50% off',
    })
    expect(t).toContain('\\href{mailto:a\\%b@c\\_d.com}')
    expect(t).toContain('github.com/u\\#r\\&v}')
    expect(t).toContain('\\textbackslash{}')
    expect(t).not.toContain('\\textbackslash\\{\\}')
    expect(t).toContain('50\\% off')
  })
  it('omits empty sections', () => {
    const tex2 = renderResumeTex({ ...CONTENT, projects: [], skills: [], education: [] })
    expect(tex2).not.toContain('\\section{Projects}')
    expect(tex2).not.toContain('\\section{Skills}')
    expect(tex2).not.toContain('\\section{Education}')
  })
})
