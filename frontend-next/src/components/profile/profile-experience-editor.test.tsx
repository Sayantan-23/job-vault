// frontend-next/src/components/profile/profile-experience-editor.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileExperienceEditor } from './profile-experience-editor'
import { newExperience } from '@/lib/profile'
import type { ProfileExperience } from '@/types/profile'

const EXP: ProfileExperience = { ...newExperience(), company: 'Acme', role: 'SWE' }

describe('ProfileExperienceEditor', () => {
  it('renders each entry with its company', () => {
    render(<ProfileExperienceEditor value={[EXP]} onChange={vi.fn()} />)
    expect((screen.getByLabelText('Experience 1 company') as HTMLInputElement).value).toBe('Acme')
  })
  it('adds an entry', async () => {
    const onChange = vi.fn()
    render(<ProfileExperienceEditor value={[]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /add experience/i }))
    expect((onChange.mock.calls[0]?.[0] as ProfileExperience[]).length).toBe(1)
  })
  it('toggling “current” clears the end date', async () => {
    const onChange = vi.fn()
    const withEnd: ProfileExperience = { ...EXP, endDate: { month: 1, year: 2024 }, current: false }
    render(<ProfileExperienceEditor value={[withEnd]} onChange={onChange} />)
    await userEvent.click(screen.getByLabelText('Experience 1 currently working here'))
    const next = onChange.mock.calls[0]?.[0] as ProfileExperience[]
    expect(next[0]?.current).toBe(true)
    expect(next[0]?.endDate).toBeNull()
  })
  it('removes an entry', async () => {
    const onChange = vi.fn()
    render(<ProfileExperienceEditor value={[EXP]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove experience 1' }))
    expect(onChange).toHaveBeenCalledWith([])
  })
  it('sets the employment type', async () => {
    const onChange = vi.fn()
    render(<ProfileExperienceEditor value={[EXP]} onChange={onChange} />)
    await userEvent.selectOptions(screen.getByLabelText('Experience 1 employment type'), 'internship')
    const next = onChange.mock.calls[0]?.[0] as ProfileExperience[]
    expect(next[0]?.employmentType).toBe('internship')
  })
})
