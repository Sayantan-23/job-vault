import { describe, it, expect } from 'vitest'
import { ResumeContentSchema } from './resume-content.schema.js'

describe('ResumeContentSchema', () => {
  it('parses a full résumé and defaults empty arrays', () => {
    const parsed = ResumeContentSchema.parse({
      basics: { name: 'Kartick Sadhu', email: 'k@example.com', links: [{ label: 'GitHub', url: 'github.com/x' }] },
      summary: 'Backend engineer.',
      experience: [{ company: 'Weloin', title: 'SWE', date: 'Jan 2024 - present', bullets: ['Built **CI/CD**'] }],
      projects: [{ name: 'MaxFlow', tagline: 'Workflow SaaS', bullets: ['NATS JetStream'] }],
      skills: [{ category: 'Languages', items: ['TypeScript'] }],
      education: [{ degree: 'MCA', institution: 'Brainware', period: '2022-2024' }],
    })
    expect(parsed.basics.name).toBe('Kartick Sadhu')
    expect(parsed.basics.links).toHaveLength(1)
    expect(parsed.experience[0]?.bullets[0]).toContain('**CI/CD**')
  })

  it('defaults missing collections so a name-only payload is valid', () => {
    const parsed = ResumeContentSchema.parse({ basics: { name: 'A' } })
    expect(parsed.summary).toBe('')
    expect(parsed.experience).toEqual([])
    expect(parsed.basics.links).toEqual([])
  })

  it('rejects a missing name', () => {
    expect(ResumeContentSchema.safeParse({ basics: {} }).success).toBe(false)
  })
})
