import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RefineControls } from './refine-controls'

describe('RefineControls', () => {
  it('runs a preset action when a chip is clicked', async () => {
    const onRun = vi.fn()
    render(<RefineControls busy={false} onRun={onRun} />)
    await userEvent.click(screen.getByRole('button', { name: /humanize/i }))
    expect(onRun).toHaveBeenCalledWith('humanize', undefined)
  })

  it('passes the typed instructions as extra steering on a preset chip', async () => {
    const onRun = vi.fn()
    render(<RefineControls busy={false} onRun={onRun} />)
    await userEvent.type(screen.getByPlaceholderText(/tell the ai what to change/i), 'warmer tone')
    await userEvent.click(screen.getByRole('button', { name: /shorten/i }))
    expect(onRun).toHaveBeenCalledWith('shorten', 'warmer tone')
  })

  it('disables the custom Improve button until text is entered, then runs a custom action', async () => {
    const onRun = vi.fn()
    render(<RefineControls busy={false} onRun={onRun} />)
    const submit = screen.getByRole('button', { name: /^improve$/i })
    expect(submit).toBeDisabled()
    await userEvent.type(screen.getByPlaceholderText(/tell the ai what to change/i), 'Make it warmer')
    expect(submit).toBeEnabled()
    await userEvent.click(submit)
    expect(onRun).toHaveBeenCalledWith('custom', 'Make it warmer')
  })

  it('disables everything while busy', () => {
    render(<RefineControls busy onRun={vi.fn()} />)
    expect(screen.getByRole('button', { name: /humanize/i })).toBeDisabled()
    expect(screen.getByPlaceholderText(/tell the ai what to change/i)).toBeDisabled()
  })
})
