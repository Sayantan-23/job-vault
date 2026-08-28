import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Tabs } from './Tabs'

const items = [
  { id: 'job', label: 'Save job' },
  { id: 'answers', label: 'Answers' },
]

describe('Tabs', () => {
  it('marks the active tab as selected', () => {
    render(<Tabs items={items} active="answers" onChange={() => {}} />)
    expect(screen.getByRole('tab', { name: 'Answers' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Save job' })).toHaveAttribute('aria-selected', 'false')
  })

  it('calls onChange with the clicked tab id', async () => {
    const onChange = vi.fn()
    render(<Tabs items={items} active="answers" onChange={onChange} />)
    await userEvent.click(screen.getByRole('tab', { name: 'Save job' }))
    expect(onChange).toHaveBeenCalledWith('job')
  })

  it('exposes a tablist', () => {
    render(<Tabs items={items} active="job" onChange={() => {}} />)
    expect(screen.getByRole('tablist')).toBeInTheDocument()
  })
})
