// frontend-next/src/components/profile/profile-projects-editor.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileProjectsEditor } from './profile-projects-editor'
import { newProject } from '@/lib/profile'
import type { ProfileProject } from '@/types/profile'

const PROJ: ProfileProject = { ...newProject(), name: 'MaxFlow', technologies: ['NATS'] }

describe('ProfileProjectsEditor', () => {
  it('renders the project name and a technology chip', () => {
    render(<ProfileProjectsEditor value={[PROJ]} onChange={vi.fn()} />)
    expect((screen.getByLabelText('Project 1 name') as HTMLInputElement).value).toBe('MaxFlow')
    expect(screen.getByText('NATS')).toBeInTheDocument()
  })
  it('adds a project', async () => {
    const onChange = vi.fn()
    render(<ProfileProjectsEditor value={[]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /add project/i }))
    expect((onChange.mock.calls[0]?.[0] as ProfileProject[]).length).toBe(1)
  })
  it('adds a technology chip', async () => {
    const onChange = vi.fn()
    render(<ProfileProjectsEditor value={[PROJ]} onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('Project 1 technologies'), 'Go{Enter}')
    const next = onChange.mock.calls[0]?.[0] as ProfileProject[]
    expect(next[0]?.technologies).toEqual(['NATS', 'Go'])
  })
  it('sets a start year via the date picker', async () => {
    const onChange = vi.fn()
    render(<ProfileProjectsEditor value={[PROJ]} onChange={onChange} />)
    await userEvent.selectOptions(screen.getByLabelText('Project 1 start year'), '2023')
    const next = onChange.mock.calls[0]?.[0] as ProfileProject[]
    expect(next[0]?.startDate).toEqual({ month: null, year: 2023 })
  })
  it('toggling “Ongoing” clears the end date', async () => {
    const onChange = vi.fn()
    const withEnd: ProfileProject = { ...PROJ, endDate: { month: 6, year: 2024 }, inProgress: false }
    render(<ProfileProjectsEditor value={[withEnd]} onChange={onChange} />)
    await userEvent.click(screen.getByLabelText('Project 1 ongoing'))
    const next = onChange.mock.calls[0]?.[0] as ProfileProject[]
    expect(next[0]?.inProgress).toBe(true)
    expect(next[0]?.endDate).toBeNull()
  })
})
