import { describe, it, expect } from 'vitest'
import {
  buildStructurePrompt,
  buildResumePrompt,
  buildCoverLetterPrompt,
  buildRefineCoverLetterPrompt,
  buildAnswerPrompt,
  AnswerDraftSchema,
} from './ai.prompts.js'
import type { ProfileContent } from '@/shared/profile-content.schema.js'

const BG: ProfileContent = { basics: { name: 'A', links: [] }, summary: 's', experience: [], projects: [], skills: [], education: [] }

describe('buildResumePrompt', () => {
  it('embeds the background and asks for the ResumeContent output JSON', () => {
    const p = buildResumePrompt(BG, null)
    expect(p).toContain('"name":"A"')
    expect(p).toMatch(/JSON/i)
    expect(p).toMatch(/double asterisks/i)
    // output stays the legacy résumé shape (title/date strings), not ProfileContent
    expect(p).toContain('"title"')
    expect(p).toContain('"date"')
  })
  it('explains the MonthYear background dates', () => {
    const p = buildResumePrompt(BG, null)
    expect(p).toContain('{month, year}')
    expect(p).toContain('Jan 2022 – Present')
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
  it('embeds the raw text and asks for the ProfileContent JSON shape', () => {
    const p = buildStructurePrompt('I led platform teams at Acme')
    expect(p).toContain('I led platform teams at Acme')
    expect(p).toMatch(/JSON/i)
    // ProfileContent markers
    expect(p).toContain('"role"')
    expect(p).toContain('"startDate"')
    expect(p).toContain('"month"')
    expect(p).toContain('"technologies"')
    expect(p).toContain('"fieldOfStudy"')
    expect(p).toMatch(/double asterisks/i)
    expect(p).toMatch(/never invent/i)
  })
  it('tells the model to omit ids and use null for unknown dates', () => {
    const p = buildStructurePrompt('text')
    expect(p).toMatch(/omit all "id" fields/i)
    expect(p).toMatch(/null/)
  })
  it('does not describe the legacy ResumeContent shape', () => {
    const p = buildStructurePrompt('text')
    expect(p).not.toContain('"tagline"')
    expect(p).not.toContain('"period"')
  })
})

describe('buildCoverLetterPrompt', () => {
  it('asks for a Markdown letter tailored to the job, no invention', () => {
    const p = buildCoverLetterPrompt(BG, { title: 'Backend Engineer', company: 'Acme', snapshot: 'Go' }, 'be concise')
    expect(p).toMatch(/markdown/i)
    expect(p).toContain('Backend Engineer')
    expect(p).toContain('Acme')
    expect(p).toContain('Go')
    expect(p).toContain('be concise')
    expect(p).toMatch(/do not invent|truthful/i)
    expect(p).toContain('"name":"A"')
  })
  it('explains the MonthYear background dates', () => {
    const p = buildCoverLetterPrompt(BG, { title: 'T', company: 'C' })
    expect(p).toContain('{month, year}')
    expect(p).toContain('Jan 2022 – Present')
  })
})

describe('buildRefineCoverLetterPrompt', () => {
  const BODY = 'Dear hiring manager,\n\nI led the platform team at Acme.'

  it('embeds the current letter body and the no-invent / output-only-Markdown guardrails', () => {
    const p = buildRefineCoverLetterPrompt(BODY, 'humanize')
    expect(p).toContain(BODY)
    expect(p).toMatch(/do not invent/i)
    expect(p).toMatch(/only the revised letter body in Markdown/i)
    expect(p).toMatch(/no code fences/i)
  })

  it('includes the per-action guide text for each preset', () => {
    expect(buildRefineCoverLetterPrompt(BODY, 'humanize')).toMatch(/strip robotic, generic, or clichéd AI phrasing/i)
    expect(buildRefineCoverLetterPrompt(BODY, 'shorten')).toMatch(/more concise/i)
    expect(buildRefineCoverLetterPrompt(BODY, 'lengthen')).toMatch(/expand it with more relevant, specific detail/i)
    expect(buildRefineCoverLetterPrompt(BODY, 'fix-grammar')).toMatch(/fix grammar, spelling, and punctuation/i)
  })

  it('includes the ADDITIONAL INSTRUCTIONS block for the custom action', () => {
    const p = buildRefineCoverLetterPrompt(BODY, 'custom', 'mention my open-source work')
    expect(p).toMatch(/apply the user instructions below/i)
    expect(p).toContain('ADDITIONAL INSTRUCTIONS:')
    expect(p).toContain('mention my open-source work')
  })

  it('omits the ADDITIONAL INSTRUCTIONS block for a preset without instructions', () => {
    const p = buildRefineCoverLetterPrompt(BODY, 'shorten')
    expect(p).not.toContain('ADDITIONAL INSTRUCTIONS:')
  })
})

describe('buildAnswerPrompt', () => {
  const background = {
    basics: { name: 'Ada', links: [] },
    summary: 'Backend engineer',
    experience: [],
    projects: [],
    skills: [],
    education: [],
  }

  it('includes the question, the background and both character budgets', () => {
    const prompt = buildAnswerPrompt(background, 'Why are you leaving your current role?')
    expect(prompt).toContain('Why are you leaving your current role?')
    expect(prompt).toContain('Backend engineer')
    expect(prompt).toContain('500')
    expect(prompt).toContain('2000')
  })

  it('asks for plain prose, not markdown — the destination is a bare textarea', () => {
    expect(buildAnswerPrompt(background, 'Why?')).toMatch(/plain prose/i)
  })

  it('omits the job section when no job is given', () => {
    expect(buildAnswerPrompt(background, 'Why?')).not.toContain('TARGET JOB')
  })

  it('includes the job section when a job is given', () => {
    const prompt = buildAnswerPrompt(background, 'Why?', { title: 'Staff Engineer', company: 'Acme', snapshot: 'We build things' })
    expect(prompt).toContain('TARGET JOB')
    expect(prompt).toContain('Acme')
    expect(prompt).toContain('We build things')
  })

  it('includes extra instructions when given', () => {
    expect(buildAnswerPrompt(background, 'Why?', undefined, 'Be blunt')).toContain('Be blunt')
  })
})

describe('AnswerDraftSchema', () => {
  it('accepts both variants', () => {
    expect(AnswerDraftSchema.parse({ short: 'a', long: 'b' })).toEqual({ short: 'a', long: 'b' })
  })

  it('rejects a response missing a variant', () => {
    expect(() => AnswerDraftSchema.parse({ short: 'a' })).toThrow()
  })

  it('rejects an empty variant so the retry loop catches it', () => {
    expect(AnswerDraftSchema.safeParse({ short: '', long: 'x' }).success).toBe(false)
  })
})
