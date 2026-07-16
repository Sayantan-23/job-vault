import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OutreachStatusChip } from './outreach-status-chip'

describe('OutreachStatusChip', () => {
  it.each([
    ['NO_RESPONSE', 'No response'],
    ['HEARD_BACK', 'Heard back'],
    ['REFERRED', 'Referred'],
    ['DECLINED', 'Declined'],
  ] as const)('renders the %s label', (status, label) => {
    render(<OutreachStatusChip status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })
})
