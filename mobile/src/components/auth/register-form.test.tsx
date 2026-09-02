import { fireEvent, render, screen } from '@testing-library/react-native';

import * as auth from '@/lib/auth';
import { RegisterForm } from './register-form';

jest.mock('expo-router', () => ({ useRouter: () => ({ replace: jest.fn() }) }));
jest.mock('@/lib/auth', () => ({ login: jest.fn(), register: jest.fn(), logout: jest.fn() }));

const register = auth.register as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  register.mockResolvedValue({ id: 'u1', name: 'Ada', email: 'ada@jobvault.app' });
});

describe('RegisterForm', () => {
  // Guards the argument order — three same-typed strings in a row.
  it('submits name, email and password in that order', async () => {
    await render(<RegisterForm />);

    await fireEvent.changeText(screen.getByLabelText('Name'), 'Ada');
    await fireEvent.changeText(screen.getByLabelText('Email'), 'ada@jobvault.app');
    await fireEvent.changeText(screen.getByLabelText('Password'), 'secret123');
    await fireEvent.press(screen.getByLabelText('Create account'));

    expect(register).toHaveBeenCalledWith('Ada', 'ada@jobvault.app', 'secret123');
  });
});
