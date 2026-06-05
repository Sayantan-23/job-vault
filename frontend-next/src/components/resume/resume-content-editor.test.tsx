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
    const next = lastChange(onChange)
    expect(next.summary.startsWith('Backend engineer.')).toBe(true)
  })

  it('adds a bullet to an experience entry', async () => {
    const onChange = vi.fn()
    render(<ResumeContentEditor value={DATA} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /add bullet/i }))
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
})
