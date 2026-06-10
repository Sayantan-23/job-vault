import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

const { mutate } = vi.hoisted(() => ({ mutate: vi.fn() }))

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('@/hooks/use-auth', () => ({
  useCurrentUser: () => ({ data: { name: 'Grace Hopper', email: 'grace@example.com' } }),
  useLogout: () => ({ mutate, isPending: false }),
}))

import { AccountMenu } from './account-menu'

beforeEach(() => vi.clearAllMocks())

describe('AccountMenu', () => {
  it('shows the user name on the trigger', () => {
    render(<AccountMenu />)
    expect(screen.getByRole('button', { name: /open account menu/i })).toBeInTheDocument()
    expect(screen.getByText('Grace Hopper')).toBeInTheDocument()
  })

  it('opens a dropdown with Profile, Settings, and Sign out', async () => {
    render(<AccountMenu />)
    await userEvent.click(screen.getByRole('button', { name: /open account menu/i }))
    expect(screen.getByRole('link', { name: /profile/i })).toHaveAttribute('href', '/app/profile')
    expect(screen.getByRole('link', { name: /settings/i })).toHaveAttribute('href', '/app/settings')
    expect(screen.getByText('grace@example.com')).toBeInTheDocument()
  })

  it('signs out when Sign out is clicked', async () => {
    render(<AccountMenu />)
    await userEvent.click(screen.getByRole('button', { name: /open account menu/i }))
    await userEvent.click(screen.getByRole('button', { name: /sign out/i }))
    expect(mutate).toHaveBeenCalledTimes(1)
  })
})
