import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { withSafeArea } from '@/components/ui/test-safe-area';
import type { ProfileContent } from '@/types/profile';
import { ProfileScreen } from './profile-screen';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    push: jest.fn(),
    navigate: jest.fn(),
  }),
}));

const getMockProfile = (): ProfileContent => ({
  basics: {
    name: 'Ada Lovelace',
    email: 'ada@example.com',
    phone: '+44 123456',
    location: 'London',
    links: [{ id: 'link-1', label: 'GitHub', url: 'https://github.com/ada' }],
  },
  summary: 'Pioneer of computer science.',
  experience: [
    {
      id: 'exp-1',
      company: 'Analytical Engine Corp',
      role: 'Chief Mathematician',
      startDate: { month: 1, year: 1843 },
      endDate: null,
      current: true,
      bullets: ['Published the first computer algorithm.'],
    },
  ],
  projects: [
    {
      id: 'proj-1',
      name: 'Bernoulli Numbers Calculator',
      technologies: ['Punched Cards', 'Mechanical Logic'],
      bullets: [],
      links: [],
      startDate: null,
      endDate: null,
      inProgress: false,
    },
  ],
  skills: [
    {
      id: 'sk-1',
      category: 'Computing',
      items: ['Algorithms', 'Mathematics'],
    },
  ],
  education: [
    {
      id: 'edu-1',
      degree: 'Tutored Mathematics',
      institution: 'Self-directed & William Frend',
      startDate: { month: null, year: 1830 },
      endDate: { month: null, year: 1835 },
      current: false,
      bullets: [],
    },
  ],
});

let mockCurrentProfile = getMockProfile();
const mockMutate = jest.fn();

jest.mock('@/hooks/use-profile', () => ({
  useProfile: () => ({
    data: mockCurrentProfile,
    isLoading: false,
  }),
  useUpdateProfile: () => ({
    mutate: mockMutate,
    isPending: false,
    isSuccess: false,
    error: null,
  }),
}));

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return withSafeArea(<QueryClientProvider client={client}>{children}</QueryClientProvider>);
  };
}

describe('ProfileScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentProfile = getMockProfile();
  });

  it('renders profile title, header, and loaded data', async () => {
    await render(<ProfileScreen />, { wrapper: createWrapper() });

    expect(screen.getByText('Profile')).toBeTruthy();
    expect(screen.getByDisplayValue('Ada Lovelace')).toBeTruthy();
    expect(screen.getByDisplayValue('ada@example.com')).toBeTruthy();
    expect(screen.getByDisplayValue('Pioneer of computer science.')).toBeTruthy();
    expect(screen.getByText('Analytical Engine Corp')).toBeTruthy();
    expect(screen.getByText('Bernoulli Numbers Calculator')).toBeTruthy();
    expect(screen.getByText('Computing')).toBeTruthy();
    expect(screen.getByText('Algorithms')).toBeTruthy();
    expect(screen.getByText('Tutored Mathematics')).toBeTruthy();
  });

  it('calls router.back when Back button is pressed', async () => {
    await render(<ProfileScreen />, { wrapper: createWrapper() });

    await fireEvent.press(screen.getByLabelText('Back'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('calls update mutation when Save is pressed with valid data', async () => {
    await render(<ProfileScreen />, { wrapper: createWrapper() });

    await fireEvent.press(screen.getByLabelText('Save profile'));
    expect(mockMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        basics: expect.objectContaining({ name: 'Ada Lovelace' }),
      })
    );
  });

  it('allows removing a skill item from a category', async () => {
    await render(<ProfileScreen />, { wrapper: createWrapper() });

    expect(screen.getByText('Algorithms')).toBeTruthy();
    await fireEvent.press(screen.getByLabelText('Remove skill Algorithms'));
    expect(screen.queryByText('Algorithms')).toBeNull();
  });
});
