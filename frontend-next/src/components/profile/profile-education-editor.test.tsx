// frontend-next/src/components/profile/profile-education-editor.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileEducationEditor } from './profile-education-editor'
import { newEducation } from '@/lib/profile'
import type { ProfileEducation } from '@/types/profile'

const EDU: ProfileEducation = { ...newEducation(), degree: 'BS', institution: 'MIT', grade: '3.9/4.0' }

describe('ProfileEducationEditor', () => {
  it('renders degree, institution, and grade', () => {
    render(<ProfileEducationEditor value={[EDU]} onChange={vi.fn()} />)
    expect((screen.getByLabelText('Education 1 degree') as HTMLInputElement).value).toBe('BS')
    expect((screen.getByLabelText('Education 1 institution') as HTMLInputElement).value).toBe('MIT')
    expect((screen.getByLabelText('Education 1 grade') as HTMLInputElement).value).toBe('3.9/4.0')
  })
  it('adds an entry', async () => {
    const onChange = vi.fn()
    render(<ProfileEducationEditor value={[]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /add education/i }))
    expect((onChange.mock.calls[0]?.[0] as ProfileEducation[]).length).toBe(1)
  })
  it('removes an entry', async () => {
    const onChange = vi.fn()
    render(<ProfileEducationEditor value={[EDU]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove education 1' }))
    expect(onChange).toHaveBeenCalledWith([])
  })
  it('edits the location', async () => {
    const onChange = vi.fn()
    render(<ProfileEducationEditor value={[EDU]} onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('Education 1 location'), 'B')
    const next = onChange.mock.calls[0]?.[0] as ProfileEducation[]
    expect(next[0]?.location).toBe('B')
  })
  it('adds a highlight bullet', async () => {
    const onChange = vi.fn()
    render(<ProfileEducationEditor value={[EDU]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /add bullet/i }))
    const next = onChange.mock.calls[0]?.[0] as ProfileEducation[]
    expect(next[0]?.bullets).toEqual([''])
  })
})
