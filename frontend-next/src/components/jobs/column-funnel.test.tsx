import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ColumnFunnel } from './column-funnel'

describe('ColumnFunnel', () => {
  it('opens the menu content on click', () => {
    render(<ColumnFunnel label="Filter by status"><div>MENU BODY</div></ColumnFunnel>)
    expect(screen.queryByText('MENU BODY')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /filter by status/i }))
    expect(screen.getByText('MENU BODY')).toBeInTheDocument()
  })
  it('marks the trigger active when a filter is applied', () => {
    render(<ColumnFunnel label="Filter by status" active><div>x</div></ColumnFunnel>)
    expect(screen.getByRole('button', { name: /filter by status/i })).toHaveAttribute('data-active', 'true')
  })
})
