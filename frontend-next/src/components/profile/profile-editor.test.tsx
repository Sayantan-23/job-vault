// frontend-next/src/components/profile/profile-editor.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ProfileEditor } from './profile-editor'
import { emptyProfileContent } from '@/lib/profile'

describe('ProfileEditor', () => {
  it('renders all six section headings', () => {
    render(<ProfileEditor value={emptyProfileContent()} onChange={vi.fn()} />)
    for (const h of ['Basics', 'Summary', 'Experience', 'Projects', 'Skills', 'Education']) {
      expect(screen.getByRole('heading', { name: h })).toBeInTheDocument()
    }
  })
  it('edits the summary', async () => {
    const onChange = vi.fn()
    render(<ProfileEditor value={emptyProfileContent()} onChange={onChange} />)
    await userEvent.type(screen.getByLabelText('Professional summary'), 'X')
    expect(onChange).toHaveBeenCalled()
    expect(onChange.mock.calls.at(-1)?.[0].summary).toBe('X')
  })
})
