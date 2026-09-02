import { fireEvent, render, screen } from '@testing-library/react-native';

import * as auth from '@/lib/auth';
import { setSession } from '@/lib/session';
import { AccountMenu } from './account-menu';

jest.mock('@/lib/auth', () => ({ login: jest.fn(), register: jest.fn(), logout: jest.fn() }));

const logout = auth.logout as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  logout.mockResolvedValue(undefined);
  setSession({ status: 'signedIn', user: { id: 'u1', name: 'Ada', email: 'ada@jobvault.app' } });
});

describe('AccountMenu', () => {
  it('shows who is signed in once opened', async () => {
    await render(<AccountMenu />);

    expect(screen.queryByText('ada@jobvault.app')).toBeNull();

    await fireEvent.press(screen.getByLabelText('Open account menu'));

    expect(screen.getByText('Ada')).toBeTruthy();
    expect(screen.getByText('ada@jobvault.app')).toBeTruthy();
  });

  // Sign out is the only item until the profile and settings screens exist.
  it('signs out and dismisses itself', async () => {
    await render(<AccountMenu />);
    await fireEvent.press(screen.getByLabelText('Open account menu'));

    await fireEvent.press(screen.getByLabelText('Sign out'));

    expect(logout).toHaveBeenCalled();
    expect(screen.queryByText('Sign out')).toBeNull();
  });

  it('falls back to a generic label before the session resolves', async () => {
    setSession({ status: 'loading' });
    await render(<AccountMenu />);

    await fireEvent.press(screen.getByLabelText('Open account menu'));

    expect(screen.getByText('Account')).toBeTruthy();
  });
});
