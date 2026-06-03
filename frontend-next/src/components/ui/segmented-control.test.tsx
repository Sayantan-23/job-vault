import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { LayoutGrid, List } from 'lucide-react'
import { SegmentedControl } from './segmented-control'

const OPTIONS = [
  { value: 'board', label: 'Board', icon: LayoutGrid },
  { value: 'list', label: 'List', icon: List },
] as const

describe('SegmentedControl', () => {
  it('marks the active option as pressed', () => {
    render(<SegmentedControl value="list" onValueChange={() => {}} options={OPTIONS} aria-label="View" />)
    expect(screen.getByRole('button', { name: 'List' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Board' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onValueChange with the clicked option value', async () => {
    const onValueChange = vi.fn()
    render(<SegmentedControl value="list" onValueChange={onValueChange} options={OPTIONS} aria-label="View" />)
    await userEvent.click(screen.getByRole('button', { name: 'Board' }))
    expect(onValueChange).toHaveBeenCalledWith('board')
  })
})
