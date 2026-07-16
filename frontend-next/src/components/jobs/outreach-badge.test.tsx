import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { OutreachBadge } from './outreach-badge'

describe('OutreachBadge', () => {
  it('renders nothing when count is 0 or undefined', () => {
    const { container } = render(<OutreachBadge variant="list" count={0} replies={0} />)
    expect(container).toBeEmptyDOMElement()
    const { container: c2 } = render(<OutreachBadge variant="card" />)
    expect(c2).toBeEmptyDOMElement()
  })

  it('list variant shows count and replies text', () => {
    render(<OutreachBadge variant="list" count={3} replies={1} />)
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('· 1 replied')).toBeInTheDocument()
  })

  it('list variant omits replies text at zero replies', () => {
    render(<OutreachBadge variant="list" count={2} replies={0} />)
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.queryByText(/replied/)).not.toBeInTheDocument()
  })

  it('card variant carries a tooltip and reply tint', () => {
    render(<OutreachBadge variant="card" count={3} replies={2} />)
    const badge = screen.getByTestId('outreach-badge')
    expect(badge).toHaveAttribute('title', '3 contacted · 2 replied')
    expect(badge.className).toContain('text-primary')
  })

  it('card variant stays muted with zero replies', () => {
    render(<OutreachBadge variant="card" count={3} replies={0} />)
    expect(screen.getByTestId('outreach-badge').className).not.toContain('text-primary')
  })
})
