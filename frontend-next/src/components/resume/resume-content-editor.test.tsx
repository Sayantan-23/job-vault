import { describe, it, expect, vi } from 'vitest'
import type { Mock } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ResumeContent } from '@/types/resume'
import { ResumeContentEditor } from './resume-content-editor'

function lastChange(onChange: Mock): ResumeContent {
  const calls = onChange.mock.calls
  const last = calls[calls.length - 1]
  expect(last).toBeDefined()
  return (last as [ResumeContent])[0]
}

const DATA: ResumeContent = {
  basics: { name: 'Kartick', email: 'k@x.com', links: [] },
  summary: 'Backend engineer.',
  experience: [{ company: 'Weloin', title: 'SWE', date: '2024', bullets: ['Built CI/CD'] }],
  projects: [{ name: 'MaxFlow', tagline: 'SaaS', bullets: [] }],
  skills: [{ category: 'Languages', items: ['TypeScript'] }],
  education: [{ degree: 'MCA', institution: 'Brainware', period: '2022-2024' }],
}

describe('ResumeContentEditor', () => {
  it('edits the summary text', async () => {
    const onChange = vi.fn()
    render(<ResumeContentEditor value={DATA} onChange={onChange} />)
    const summary = screen.getByLabelText(/summary/i)
    await userEvent.type(summary, '!')
    expect(onChange).toHaveBeenCalled()
    const next = lastChange(onChange)
    expect(next.summary).toBe('Backend engineer.!')
  })

  it('adds a bullet to an experience entry', async () => {
    const onChange = vi.fn()
    render(<ResumeContentEditor value={DATA} onChange={onChange} />)
    const [experienceAddBullet] = screen.getAllByRole('button', { name: /add bullet/i })
    await userEvent.click(experienceAddBullet as HTMLElement)
    const next = lastChange(onChange)
    expect(next.experience[0]?.bullets).toHaveLength(2)
  })

  it('removes an experience entry', async () => {
    const onChange = vi.fn()
    render(<ResumeContentEditor value={DATA} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /remove experience/i }))
    const next = lastChange(onChange)
    expect(next.experience).toHaveLength(0)
  })

  it('edits a skill group category', async () => {
    const onChange = vi.fn()
    render(<ResumeContentEditor value={DATA} onChange={onChange} />)
    await userEvent.type(screen.getByLabelText(/skill group 1 category/i), 'X')
    const next = lastChange(onChange)
    expect((next.skills[0]?.category.length ?? 0)).toBeGreaterThan(DATA.skills[0]?.category.length ?? 0)
  })

  it('removes a project entry', async () => {
    const onChange = vi.fn()
    render(<ResumeContentEditor value={DATA} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /remove project 1/i }))
    expect(lastChange(onChange).projects).toHaveLength(DATA.projects.length - 1)
  })

  it('removes an education entry', async () => {
    const onChange = vi.fn()
    render(<ResumeContentEditor value={DATA} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /remove education 1/i }))
    expect(lastChange(onChange).education).toHaveLength(DATA.education.length - 1)
  })
})
