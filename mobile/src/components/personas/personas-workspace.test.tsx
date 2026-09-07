import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { withSafeArea } from '@/components/ui/test-safe-area';
import { emptyProfileContent } from '@/lib/profile';
import type { Persona } from '@/types/persona';
import { PersonasWorkspace } from './personas-workspace';

const mockPush = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: mockBack,
  }),
}));

const mockDeleteMutate = jest.fn();

const mockPersonas: Persona[] = [
  {
    id: 'p-1',
    createdAt: '2026-06-01T12:00:00Z',
    updatedAt: '2026-06-02T12:00:00Z',
    userId: 'u-1',
    name: 'Full Stack Engineer',
    data: {
      ...emptyProfileContent(),
      summary: 'Experienced across React and Node.',
      experience: [
        {
          id: 'exp-1',
          company: 'Acme Corp',
          role: 'Full Stack Dev',
          startDate: null,
          endDate: null,
          current: true,
          bullets: ['Built APIs'],
        },
      ],
      projects: [
        {
          id: 'proj-1',
          name: 'OpenSource CLI',
          technologies: ['TypeScript'],
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
          category: 'Languages',
          items: ['TypeScript', 'Python'],
        },
      ],
    },
  },
];

let mockCurrentPersonas: Persona[] = mockPersonas;
let mockIsLoading = false;

jest.mock('@/hooks/use-personas', () => ({
  usePersonas: () => ({
    data: mockCurrentPersonas,
    isLoading: mockIsLoading,
    isRefetching: false,
    refetch: jest.fn(),
    error: null,
  }),
  useDeletePersona: () => ({
    mutate: mockDeleteMutate,
    isPending: false,
    error: null,
  }),
  useCreatePersona: () => ({
    mutate: jest.fn(),
    isPending: false,
    error: null,
    reset: jest.fn(),
  }),
}));

jest.mock('@/hooks/use-profile', () => {
  const { emptyProfileContent } = jest.requireActual('@/lib/profile');
  return {
    useProfile: () => ({
      data: emptyProfileContent(),
      isLoading: false,
    }),
  };
});

function createWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return withSafeArea(<QueryClientProvider client={client}>{children}</QueryClientProvider>);
  };
}

describe('PersonasWorkspace', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockCurrentPersonas = mockPersonas;
    mockIsLoading = false;
  });

  it('renders persona cards with counts and summary', async () => {
    await render(<PersonasWorkspace />, { wrapper: createWrapper() });

    expect(screen.getByText('Personas')).toBeTruthy();
    expect(screen.getByText('1 / 5')).toBeTruthy();
    expect(screen.getByText('Full Stack Engineer')).toBeTruthy();
    expect(screen.getByText('1 role')).toBeTruthy();
    expect(screen.getByText('1 project')).toBeTruthy();
    expect(screen.getByText('2 skills')).toBeTruthy();
    expect(screen.getByText('Experienced across React and Node.')).toBeTruthy();
  });

  it('navigates to persona detail when Edit is pressed', async () => {
    await render(<PersonasWorkspace />, { wrapper: createWrapper() });

    await fireEvent.press(screen.getByLabelText('Edit persona Full Stack Engineer'));
    expect(mockPush).toHaveBeenCalledWith('/personas/p-1');
  });

  it('shows empty state when no personas exist', async () => {
    mockCurrentPersonas = [];
    await render(<PersonasWorkspace />, { wrapper: createWrapper() });

    expect(screen.getByText('No personas yet')).toBeTruthy();
    expect(
      screen.getByText('Create a persona to start generating tailored résumés and cover letters.')
    ).toBeTruthy();
  });

  it('opens confirmation dialog on delete and executes mutation', async () => {
    await render(<PersonasWorkspace />, { wrapper: createWrapper() });

    await fireEvent.press(screen.getByLabelText('Delete persona Full Stack Engineer'));
    expect(screen.getByText('Delete persona?')).toBeTruthy();
    expect(
      screen.getByText(
        '"Full Stack Engineer" will be permanently deleted. Résumés and cover letters already generated from it are not affected.'
      )
    ).toBeTruthy();

    await fireEvent.press(screen.getByText('Delete'));
    expect(mockDeleteMutate).toHaveBeenCalledWith('p-1');
  });

  it('disables New button when cap of 5 personas is reached', async () => {
    mockCurrentPersonas = Array.from({ length: 5 }, (_, i) => ({
      ...mockPersonas[0],
      id: `p-${i}`,
      name: `Persona ${i + 1}`,
    }));

    await render(<PersonasWorkspace />, { wrapper: createWrapper() });

    expect(screen.getByText('5 / 5')).toBeTruthy();
    expect(
      screen.getByText('You’ve reached the maximum of 5 personas. Delete one to add another.')
    ).toBeTruthy();

    const newBtn = screen.getByLabelText('New persona');
    expect(newBtn.props.accessibilityState.disabled).toBe(true);
  });
});
