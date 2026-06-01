import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AppShell } from './app-shell'

describe('AppShell', () => {
  it('renders the primary navigation links', () => {
    render(<AppShell>content</AppShell>)
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/app/dashboard')
    expect(screen.getByRole('link', { name: 'Timeline' })).toHaveAttribute('href', '/app/timeline')
    expect(screen.getByRole('link', { name: 'Settings' })).toHaveAttribute('href', '/app/settings')
  })

  it('renders its children in the main region', () => {
    render(<AppShell>hello-region</AppShell>)
    expect(screen.getByRole('main')).toHaveTextContent('hello-region')
  })
})
