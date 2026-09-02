import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { ApiError } from '@/lib/api-client';
import * as auth from '@/lib/auth';
import { LoginForm } from './login-form';

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn() }) }));
jest.mock('@/lib/auth', () => ({ login: jest.fn(), register: jest.fn(), logout: jest.fn() }));

const login = auth.login as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('LoginForm', () => {
  it('submits what was typed', async () => {
    login.mockResolvedValue({ id: 'u1', name: 'Ada', email: 'ada@jobvault.app' });
    await render(<LoginForm />);

    await fireEvent.changeText(screen.getByLabelText('Email'), 'ada@jobvault.app');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'secret123');
    await fireEvent.press(screen.getByLabelText('Sign in'));

    expect(login).toHaveBeenCalledWith('ada@jobvault.app', 'secret123');
  });

  // The screen shows the failure and stays put; navigation is the guard's job.
  it('shows the backend message when the credentials are rejected', async () => {
    login.mockRejectedValue(new ApiError(401, 'Invalid email or password', 'UNAUTHORIZED'));
    await render(<LoginForm />);

    await fireEvent.press(screen.getByLabelText('Sign in'));

    await waitFor(() => expect(screen.getByText('Invalid email or password')).toBeTruthy());
  });
});
