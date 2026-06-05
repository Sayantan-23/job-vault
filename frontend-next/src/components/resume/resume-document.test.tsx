import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import type { ResumeContent } from '@/types/resume'
import { ResumeDocument } from './resume-document'

const C: ResumeContent = {
  basics: { name: 'Kartick', email: 'k@x.com', links: [{ label: 'GitHub', url: 'github.com/x' }] },
  summary: 'Backend **engineer**.',
  experience: [{ company: 'Weloin', title: 'SWE', date: '2024', bullets: ['Built **CI/CD**'] }],
  projects: [{ name: 'MaxFlow', tagline: 'SaaS', bullets: ['NATS'] }],
  skills: [{ category: 'Languages', items: ['TypeScript'] }],
  education: [{ degree: 'MCA', institution: 'Brainware', period: '2022-2024' }],
}

describe('ResumeDocument', () => {
  it('is a component that builds an element tree without throwing', () => {
    expect(typeof ResumeDocument).toBe('function')
    expect(() => createElement(ResumeDocument, { content: C })).not.toThrow()
  })
})
