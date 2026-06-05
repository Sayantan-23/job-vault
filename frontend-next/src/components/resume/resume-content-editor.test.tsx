import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ResumeContent } from '@/types/resume'
import { ResumeContentEditor } from './resume-content-editor'

const DATA: ResumeContent = {
  basics: { name: 'Kartick', email: 'k@x.com', links: [] },
  summary: 'Backend engineer.',
  experience: [{ company: 'Weloin', title: 'SWE', date: '2024', bullets: ['Built CI/CD'] }],
  projects: [],
  skills: [{ category: 'Languages', items: ['TypeScript'] }],
  education: [],
}

describe('ResumeContentEditor', () => {
  it('edits the summary text', async () => {
    const onChange = vi.fn()
    render(<ResumeContentEditor value={DATA} onChange={onChange} />)
    const summary = screen.getByLabelText(/summary/i)
    await userEvent.type(summary, '!')
    expect(onChange).toHaveBeenCalled()
    const next = onChange.mock.calls.at(-1)![0] as ResumeContent
    expect(next.summary.startsWith('Backend engineer.')).toBe(true)
  })

  it('adds a bullet to an experience entry', async () => {
    const onChange = vi.fn()
    render(<ResumeContentEditor value={DATA} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /add bullet/i }))
    const next = onChange.mock.calls.at(-1)![0] as ResumeContent
    expect(next.experience[0]!.bullets).toHaveLength(2)
  })

  it('removes an experience entry', async () => {
    const onChange = vi.fn()
    render(<ResumeContentEditor value={DATA} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /remove experience/i }))
    const next = onChange.mock.calls.at(-1)![0] as ResumeContent
    expect(next.experience).toHaveLength(0)
  })
})
