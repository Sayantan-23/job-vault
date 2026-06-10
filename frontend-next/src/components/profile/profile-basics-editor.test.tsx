// frontend-next/src/components/profile/profile-basics-editor.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileBasicsEditor } from './profile-basics-editor'
import type { ProfileBasics } from '@/types/profile'

const BASICS: ProfileBasics = { name: 'Ada', email: 'a@x.com', phone: '', location: '', links: [] }

describe('ProfileBasicsEditor', () => {
  it('renders the name and email', () => {
    render(<ProfileBasicsEditor value={BASICS} onChange={vi.fn()} />)
    expect((screen.getByLabelText('Full name') as HTMLInputElement).value).toBe('Ada')
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('a@x.com')
  })
  it('edits the name', async () => {
    const onChange = vi.fn()
    render(<ProfileBasicsEditor value={BASICS} onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('Full name'), '!')
    expect(onChange).toHaveBeenCalledWith({ ...BASICS, name: 'Ada!' })
  })
})
