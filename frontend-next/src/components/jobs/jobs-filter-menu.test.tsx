import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { JobsFilterMenu } from './jobs-filter-menu'

function setup(props: Partial<Parameters<typeof JobsFilterMenu>[0]> = {}) {
  const onApply = vi.fn()
  render(<JobsFilterMenu status={undefined} onApply={onApply} {...props} />)
  return { onApply }
}

function open() {
  fireEvent.click(screen.getByRole('button', { name: /filter jobs/i }))
}

describe('JobsFilterMenu', () => {
  it('renders a single labeled Filter trigger (not bare funnel icons)', () => {
    setup()
    expect(screen.getByRole('button', { name: /filter jobs/i })).toHaveTextContent('Filter')
  })

  it('opens one popover holding Status + Date-added sections and shared Clear/Apply', () => {
    setup()
    expect(screen.queryByText('All statuses')).not.toBeInTheDocument()
    open()
    expect(screen.getByText('All statuses')).toBeInTheDocument()
    expect(screen.getByLabelText(/from/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/to/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^apply$/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^clear$/i })).toBeInTheDocument()
  })

  it('shows no active count when nothing is applied', () => {
    setup()
    expect(screen.getByRole('button', { name: /filter jobs/i })).toHaveAttribute('data-active', 'false')
  })

  it('counts each applied facet (status + date)', () => {
    setup({ status: 'APPLIED', createdFrom: '2022-01-01' })
    const trigger = screen.getByRole('button', { name: /filter jobs/i })
    expect(trigger).toHaveAttribute('data-active', 'true')
    expect(trigger).toHaveTextContent('2')
  })

  it('staging: picking a status does NOT apply until Apply is clicked', () => {
    const { onApply } = setup()
    open()
    fireEvent.click(screen.getByRole('option', { name: /applied/i }))
    expect(onApply).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: /^apply$/i }))
    expect(onApply).toHaveBeenCalledWith({ status: 'APPLIED', from: undefined, to: undefined })
  })

  it('Apply commits the staged status + date range together and closes', () => {
    const { onApply } = setup()
    open()
    fireEvent.click(screen.getByRole('option', { name: /interviewing/i }))
    fireEvent.change(screen.getByLabelText(/from/i), { target: { value: '2022-01-01' } })
    fireEvent.change(screen.getByLabelText(/to/i), { target: { value: '2022-12-31' } })
    fireEvent.click(screen.getByRole('button', { name: /^apply$/i }))
    expect(onApply).toHaveBeenCalledWith({ status: 'INTERVIEWING', from: '2022-01-01', to: '2022-12-31' })
    expect(screen.queryByRole('button', { name: /^apply$/i })).not.toBeInTheDocument()
  })

  it('Clear removes all filters and closes', () => {
    const { onApply } = setup({ status: 'APPLIED', createdFrom: '2022-01-01' })
    open()
    fireEvent.click(screen.getByRole('button', { name: /^clear$/i }))
    expect(onApply).toHaveBeenCalledWith({})
    expect(screen.queryByRole('button', { name: /^clear$/i })).not.toBeInTheDocument()
  })

  it('disables Clear when nothing is staged or applied', () => {
    setup()
    open()
    expect(screen.getByRole('button', { name: /^clear$/i })).toBeDisabled()
  })

  it('reflects the applied status as the staged selection on open', () => {
    setup({ status: 'INTERVIEWING' })
    open()
    const listbox = screen.getByRole('listbox', { name: /filter by status/i })
    expect(within(listbox).getByRole('option', { name: /interviewing/i })).toHaveAttribute(
      'aria-selected',
      'true',
    )
  })
})
