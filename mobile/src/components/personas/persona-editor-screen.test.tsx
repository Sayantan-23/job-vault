import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import { withSafeArea } from '@/components/ui/test-safe-area';
import { emptyProfileContent } from '@/lib/profile';
import type { Persona } from '@/types/persona';
import type { ProfileContent } from '@/types/profile';
import { PersonaEditorScreen } from './persona-editor-screen';

const mockBack = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    back: mockBack,
    push: jest.fn(),
  }),
}));

const mockUpdateMutate = jest.fn();

const getMockPersona = (): Persona => ({
  id: 'pers-1',
  createdAt: '2026-06-01T12:00:00Z',
  updatedAt: '2026-06-01T12:00:00Z',
  userId: 'u-1',
  name: 'Platform Engineer',
  data: {
    ...emptyProfileContent(),
    summary: 'Focusing on distributed systems and k8s.',
    experience: [
      {
        id: 'exp-1',
        company: 'Cloud Corp',
        role: 'Infra Lead',
        startDate: { month: 1, year: 2022 },
        endDate: null,
        current: true,
        bullets: ['Managed clusters'],
      },
    ],
    skills: [
      {
        id: 'sk-1',
        category: 'Infra',
        items: ['Kubernetes', 'Terraform'],
      },
    ],
  },
});

const getMockMasterProfile = (): ProfileContent => ({
  ...emptyProfileContent(),
  basics: {
    ...emptyProfileContent().basics,
    name: 'Jane Developer',
  },
  experience: [
    {
      id: 'exp-1',
      company: 'Cloud Corp',
      role: 'Infra Lead',
      startDate: { month: 1, year: 2022 },
      endDate: null,
      current: true,
      bullets: ['Managed clusters'],
    },
    {
      id: 'exp-2',
      company: 'Startup Inc',
      role: 'Backend Dev',
      startDate: { month: 3, year: 2020 },
      endDate: { month: 12, year: 2021 },
      current: false,
      bullets: ['Wrote Go services'],
    },
  ],
});

let mockPersonaData = getMockPersona();
let mockMasterProfileData = getMockMasterProfile();

jest.mock('@/hooks/use-personas', () => ({
  usePersona: () => ({
    data: mockPersonaData,
    isLoading: false,
  }),
  useUpdatePersona: () => ({
    mutate: mockUpdateMutate,
    isPending: false,
    isSuccess: false,
    error: null,
  }),
}));

jest.mock('@/hooks/use-profile', () => ({
  useProfile: () => ({
    data: mockMasterProfileData,
    isLoading: false,
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

describe('PersonaEditorScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPersonaData = getMockPersona();
    mockMasterProfileData = getMockMasterProfile();
  });

  it('renders persona title, name input, and summary', async () => {
    await render(<PersonaEditorScreen id="pers-1" />, { wrapper: createWrapper() });

    expect(screen.getByText('Edit Persona')).toBeTruthy();
    expect(screen.getByDisplayValue('Platform Engineer')).toBeTruthy();
    expect(screen.getByDisplayValue('Focusing on distributed systems and k8s.')).toBeTruthy();
  });

  it('renders item pickers showing master profile options', async () => {
    await render(<PersonaEditorScreen id="pers-1" />, { wrapper: createWrapper() });

    // Master profile experiences in picker
    expect(screen.getByText('Infra Lead @ Cloud Corp')).toBeTruthy();
    expect(screen.getByText('Backend Dev @ Startup Inc')).toBeTruthy();
  });

  it('calls update mutation when Save is pressed', async () => {
    await render(<PersonaEditorScreen id="pers-1" />, { wrapper: createWrapper() });

    await fireEvent.changeText(screen.getByLabelText('Persona name'), 'Lead Platform Engineer');
    await fireEvent.press(screen.getByLabelText('Save persona'));

    expect(mockUpdateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Lead Platform Engineer',
        data: expect.objectContaining({
          summary: 'Focusing on distributed systems and k8s.',
        }),
      })
    );
  });

  it('calls router.back when Back is pressed and not dirty', async () => {
    await render(<PersonaEditorScreen id="pers-1" />, { wrapper: createWrapper() });

    await fireEvent.press(screen.getByLabelText('Back'));
    expect(mockBack).toHaveBeenCalled();
  });

  it('prompts confirmation when Back is pressed with dirty changes', async () => {
    await render(<PersonaEditorScreen id="pers-1" />, { wrapper: createWrapper() });

    await fireEvent.changeText(screen.getByLabelText('Persona name'), 'Dirty Name');
    await fireEvent.press(screen.getByLabelText('Back'));

    expect(screen.getByText('Discard unsaved changes?')).toBeTruthy();
    expect(mockBack).not.toHaveBeenCalled();

    await fireEvent.press(screen.getByText('Discard'));
    expect(mockBack).toHaveBeenCalled();
  });
});
