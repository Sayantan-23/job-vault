// frontend-next/src/components/profile/links-editor.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LinksEditor } from './links-editor'
import type { ProfileLink } from '@/types/profile'

const LINKS: ProfileLink[] = [{ id: 'l1', label: 'GitHub', url: 'gh.com' }]

describe('LinksEditor', () => {
  it('renders existing link rows', () => {
    render(<LinksEditor value={LINKS} onChange={vi.fn()} />)
    expect((screen.getByLabelText('Link 1 label') as HTMLInputElement).value).toBe('GitHub')
    expect((screen.getByLabelText('Link 1 url') as HTMLInputElement).value).toBe('gh.com')
  })
  it('adds a link row with an id', async () => {
    const onChange = vi.fn()
    render(<LinksEditor value={[]} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: /add link/i }))
    const next = onChange.mock.calls[0]?.[0] as ProfileLink[]
    expect(next).toHaveLength(1)
    expect(next[0]?.id).toBeTruthy()
  })
  it('edits a link label', async () => {
    const onChange = vi.fn()
    render(<LinksEditor value={LINKS} onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('Link 1 label'), '!')
    expect(onChange).toHaveBeenCalledWith([{ id: 'l1', label: 'GitHub!', url: 'gh.com' }])
  })
  it('removes a link', async () => {
    const onChange = vi.fn()
    render(<LinksEditor value={LINKS} onChange={onChange} />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove link 1' }))
    expect(onChange).toHaveBeenCalledWith([])
  })
})
