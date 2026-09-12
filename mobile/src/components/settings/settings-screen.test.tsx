import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { Linking } from 'react-native';

import { APP_CONFIG } from '@/config/app';
import { withSafeArea } from '@/components/ui/test-safe-area';
import { SettingsScreen } from './settings-screen';

function renderWithClient(ui: ReactNode) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      {withSafeArea(ui)}
    </QueryClientProvider>
  );
}

const mockBack = jest.fn();
const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    push: mockPush,
  }),
}));

const mockLogout = jest.fn();
jest.mock('@/hooks/use-auth', () => ({
  useAuth: () => ({
    logout: mockLogout,
    isPending: false,
  }),
}));

const mockSetTheme = jest.fn();
let mockTheme = 'system';
jest.mock('@/hooks/use-theme', () => ({
  useTheme: () => ({
    theme: mockTheme,
    setTheme: mockSetTheme,
    effectiveTheme: 'light',
  }),
}));

let mockPushStatus = 'granted';
let mockStoredToken: string | null = 'test-token';
const mockRegister = jest.fn();
const mockUnregister = jest.fn();

jest.mock('@/lib/push-notifications', () => ({
  isPushSupported: () => true,
  getPushStatusAsync: jest.fn(() => Promise.resolve(mockPushStatus)),
  getStoredPushTokenAsync: jest.fn(() => Promise.resolve(mockStoredToken)),
  registerForPushNotificationsAsync: () => mockRegister(),
  unregisterPushTokenAsync: () => mockUnregister(),
}));

jest.mock('@/lib/session', () => ({
  useSession: () => ({
    status: 'signedIn',
    user: {
      id: 'u1',
      name: 'Ada Lovelace',
      email: 'ada@example.com',
    },
  }),
}));

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTheme = 'system';
    mockPushStatus = 'granted';
    mockStoredToken = 'test-token';
    jest.spyOn(Linking, 'canOpenURL').mockResolvedValue(true);
    jest.spyOn(Linking, 'openURL').mockResolvedValue(true as any);
  });

  it('renders header, account details, theme switcher, and app identity', async () => {
    await renderWithClient(<SettingsScreen />);

    expect(screen.getByText('Settings')).toBeTruthy();
    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    expect(screen.getByText('ada@example.com')).toBeTruthy();
    expect(screen.getByText('Appearance')).toBeTruthy();
    expect(screen.getByText('Push Notifications')).toBeTruthy();
    expect(screen.getByText(`About ${APP_CONFIG.name}`)).toBeTruthy();
    expect(screen.getByText(APP_CONFIG.packageId)).toBeTruthy();
  });

  it('navigates back when back button is pressed', async () => {
    await renderWithClient(<SettingsScreen />);

    await fireEvent.press(screen.getByLabelText('Back'));
    expect(mockBack).toHaveBeenCalledTimes(1);
  });

  it('navigates to profile when edit profile button is pressed', async () => {
    await renderWithClient(<SettingsScreen />);

    await fireEvent.press(screen.getByLabelText('Edit profile'));
    expect(mockPush).toHaveBeenCalledWith('/profile');
  });

  it('calls logout when sign out button is pressed', async () => {
    await renderWithClient(<SettingsScreen />);

    await fireEvent.press(screen.getByLabelText('Sign out'));
    expect(mockLogout).toHaveBeenCalledTimes(1);
  });

  it('allows changing theme preference', async () => {
    await renderWithClient(<SettingsScreen />);

    await fireEvent.press(screen.getByLabelText('Dark'));
    expect(mockSetTheme).toHaveBeenCalledWith('dark');
  });

  it('allows unregistering push notifications when enabled', async () => {
    await renderWithClient(<SettingsScreen />);

    const toggleButton = await screen.findByLabelText('Turn off push notifications');
    await fireEvent.press(toggleButton);

    expect(mockUnregister).toHaveBeenCalledTimes(1);
  });

  it('opens external privacy policy link when pressed', async () => {
    await renderWithClient(<SettingsScreen />);

    await fireEvent.press(screen.getByLabelText('Privacy Policy'));
    expect(Linking.openURL).toHaveBeenCalledWith(APP_CONFIG.links.privacy);
  });
});
