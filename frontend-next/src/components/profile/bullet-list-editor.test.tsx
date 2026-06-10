// frontend-next/src/components/profile/bullet-list-editor.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BulletListEditor } from './bullet-list-editor'

describe('BulletListEditor', () => {
  it('renders one textarea per bullet', () => {
    render(<BulletListEditor value={['a', 'b']} onChange={vi.fn()} ariaPrefix="Bullet" />)
    expect(screen.getByLabelText('Bullet 1')).toBeInTheDocument()
    expect(screen.getByLabelText('Bullet 2')).toBeInTheDocument()
  })
  it('adds a bullet', async () => {
    const onChange = vi.fn()
    render(<BulletListEditor value={['a']} onChange={onChange} ariaPrefix="Bullet" />)
    await userEvent.click(screen.getByRole('button', { name: /add bullet/i }))
    expect(onChange).toHaveBeenCalledWith(['a', ''])
  })
  it('edits a bullet', async () => {
    const onChange = vi.fn()
    render(<BulletListEditor value={['a']} onChange={onChange} ariaPrefix="Bullet" />)
    await userEvent.type(screen.getByLabelText('Bullet 1'), 'X')
    expect(onChange).toHaveBeenCalledWith(['aX'])
  })
  it('removes a bullet', async () => {
    const onChange = vi.fn()
    render(<BulletListEditor value={['a', 'b']} onChange={onChange} ariaPrefix="Bullet" />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove bullet 1' }))
    expect(onChange).toHaveBeenCalledWith(['b'])
  })
})
