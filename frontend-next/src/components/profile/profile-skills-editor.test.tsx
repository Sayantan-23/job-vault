// frontend-next/src/components/profile/profile-skills-editor.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileSkillsEditor } from './profile-skills-editor'
import { newSkillGroup } from '@/lib/profile'
import type { ProfileSkillGroup } from '@/types/profile'

const GROUP: ProfileSkillGroup = { ...newSkillGroup(), category: 'Languages', items: ['TypeScript'] }

describe('ProfileSkillsEditor', () => {
  it('renders a group with its category and an item chip', () => {
    render(<ProfileSkillsEditor value={[GROUP]} onChange={vi.fn()} />)
    expect((screen.getByLabelText('Skill group 1 category') as HTMLInputElement).value).toBe('Languages')
    expect(screen.getByText('TypeScript')).toBeInTheDocument()
  })
  it('adds a category group', async () => {
    const onChange = vi.fn()
    render(<ProfileSkillsEditor value={[GROUP]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /add category/i }))
    expect((onChange.mock.calls[0]?.[0] as ProfileSkillGroup[]).length).toBe(2)
  })
  it('adds an item to a group', async () => {
    const onChange = vi.fn()
    render(<ProfileSkillsEditor value={[GROUP]} onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('Skill group 1 items'), 'Go{Enter}')
    const next = onChange.mock.calls[0]?.[0] as ProfileSkillGroup[]
    expect(next[0]?.items).toEqual(['TypeScript', 'Go'])
  })
})
