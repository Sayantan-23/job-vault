// frontend-next/src/components/profile/chip-input.test.tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ChipInput } from './chip-input'

describe('ChipInput', () => {
  it('renders existing chips', () => {
    render(<ChipInput value={['React', 'Node']} onChange={vi.fn()} ariaLabel="Technologies" />)
    expect(screen.getByText('React')).toBeInTheDocument()
    expect(screen.getByText('Node')).toBeInTheDocument()
  })
  it('adds a chip on Enter', async () => {
    const onChange = vi.fn()
    render(<ChipInput value={['React']} onChange={onChange} ariaLabel="Technologies" />)
    await userEvent.type(screen.getByLabelText('Technologies'), 'Postgres{Enter}')
    expect(onChange).toHaveBeenCalledWith(['React', 'Postgres'])
  })
  it('does not add blank or duplicate chips', async () => {
    const onChange = vi.fn()
    render(<ChipInput value={['React']} onChange={onChange} ariaLabel="Technologies" />)
    await userEvent.type(screen.getByLabelText('Technologies'), '   {Enter}')
    await userEvent.type(screen.getByLabelText('Technologies'), 'React{Enter}')
    expect(onChange).not.toHaveBeenCalled()
  })
  it('removes a chip via its remove button', async () => {
    const onChange = vi.fn()
    render(<ChipInput value={['React', 'Node']} onChange={onChange} ariaLabel="Technologies" />)
    await userEvent.click(screen.getByRole('button', { name: 'Remove React' }))
    expect(onChange).toHaveBeenCalledWith(['Node'])
  })
})
