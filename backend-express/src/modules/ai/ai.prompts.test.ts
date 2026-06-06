import { describe, it, expect } from 'vitest'
import { buildStructurePrompt } from './ai.prompts.js'
import { buildResumePrompt } from './ai.prompts.js'
import type { ResumeContent } from '@/shared/resume-content.schema.js'

const BG: ResumeContent = { basics: { name: 'A', links: [] }, summary: 's', experience: [], projects: [], skills: [], education: [] }

describe('buildResumePrompt', () => {
  it('embeds the background and asks for the ResumeContent JSON', () => {
    const p = buildResumePrompt(BG, null)
    expect(p).toContain('"name":"A"')
    expect(p).toMatch(/JSON/i)
    expect(p).toMatch(/double asterisks/i)
  })
  it('includes the job when tailoring, and instructions', () => {
    const p = buildResumePrompt(BG, { title: 'Backend Engineer', company: 'Acme', snapshot: 'Go + k8s' }, 'emphasize leadership')
    expect(p).toContain('Backend Engineer')
    expect(p).toContain('Acme')
    expect(p).toContain('Go + k8s')
    expect(p).toContain('emphasize leadership')
  })
  it('never invents facts (guardrail present)', () => {
    expect(buildResumePrompt(BG, null)).toMatch(/do not invent|truthful/i)
  })
})

describe('buildStructurePrompt', () => {
  it('embeds all provided inputs and asks for the ResumeContent JSON shape', () => {
    const p = buildStructurePrompt({ freeText: 'I led teams', pastedResume: 'RESUME TEXT', fields: { basics: { name: 'Kartick', links: [] } } })
    expect(p).toContain('RESUME TEXT')
    expect(p).toContain('I led teams')
    expect(p).toContain('Kartick')
    // schema guidance
    expect(p).toMatch(/basics/)
    expect(p).toMatch(/experience/)
    expect(p).toMatch(/double asterisks/i)
    expect(p).toMatch(/JSON/i)
  })

  it('omits absent sections gracefully', () => {
    const p = buildStructurePrompt({ freeText: 'only free text' })
    expect(p).toContain('only free text')
    expect(p).not.toContain('PASTED RESUME')
  })
})

import { buildCoverLetterPrompt } from './ai.prompts.js'

describe('buildCoverLetterPrompt', () => {
  const bg: ResumeContent = { basics: { name: 'A', links: [] }, summary: 's', experience: [], projects: [], skills: [], education: [] }
  it('asks for a Markdown letter tailored to the job, no invention', () => {
    const p = buildCoverLetterPrompt(bg, { title: 'Backend Engineer', company: 'Acme', snapshot: 'Go' }, 'be concise')
    expect(p).toMatch(/markdown/i)
    expect(p).toContain('Backend Engineer')
    expect(p).toContain('Acme')
    expect(p).toContain('Go')
    expect(p).toContain('be concise')
    expect(p).toMatch(/do not invent|truthful/i)
    expect(p).toContain('"name":"A"')
  })
})
