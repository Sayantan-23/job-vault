import { fireEvent, render, screen } from '@testing-library/react-native';

import { withSafeArea } from '@/components/ui/test-safe-area';
import { emptyProfileContent } from '@/lib/profile';
import type { ProfileContent } from '@/types/profile';
import type { Persona } from '@/types/persona';
import { CreatePersonaSheet } from './create-persona-sheet';

const mockPush = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    back: jest.fn(),
  }),
}));

const mockCreateMutate = jest.fn();
jest.mock('@/hooks/use-personas', () => ({
  useCreatePersona: () => ({
    mutate: mockCreateMutate,
    isPending: false,
    error: null,
    reset: jest.fn(),
  }),
}));

const mockProfile: ProfileContent = {
  ...emptyProfileContent(),
  basics: {
    ...emptyProfileContent().basics,
    name: 'Ada Lovelace',
    email: 'ada@example.com',
  },
  summary: 'Passionate computer scientist.',
};

describe('CreatePersonaSheet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders title and fields when open', async () => {
    await render(
      withSafeArea(
        <CreatePersonaSheet
          open={true}
          onOpenChange={jest.fn()}
          profile={mockProfile}
        />
      )
    );

    expect(screen.getByText('New Persona')).toBeTruthy();
    expect(screen.getByLabelText('Persona name')).toBeTruthy();
    expect(screen.getByText('Build from profile')).toBeTruthy();
    expect(screen.getByText('Blank slate')).toBeTruthy();
  });

  it('validates that persona name is required', async () => {
    await render(
      withSafeArea(
        <CreatePersonaSheet
          open={true}
          onOpenChange={jest.fn()}
          profile={mockProfile}
        />
      )
    );

    // Name is empty initially, tapping create button
    await fireEvent.press(screen.getByLabelText('Create persona'));
    expect(screen.getByText('Persona name is required')).toBeTruthy();
    expect(mockCreateMutate).not.toHaveBeenCalled();
  });

  it('submits with profile data when in build-from-profile mode', async () => {
    const onOpenChange = jest.fn();
    mockCreateMutate.mockImplementation((body, { onSuccess }) => {
      onSuccess({ id: 'pers-123', name: body.name, data: body.data } as Persona);
    });

    await render(
      withSafeArea(
        <CreatePersonaSheet
          open={true}
          onOpenChange={onOpenChange}
          profile={mockProfile}
        />
      )
    );

    await fireEvent.changeText(screen.getByLabelText('Persona name'), 'Frontend Lead');
    await fireEvent.press(screen.getByLabelText('Create persona'));

    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Frontend Lead',
        data: expect.objectContaining({
          basics: expect.objectContaining({ name: 'Ada Lovelace' }),
          summary: 'Passionate computer scientist.',
        }),
      }),
      expect.any(Object)
    );

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(mockPush).toHaveBeenCalledWith('/personas/pers-123');
  });

  it('allows switching to blank slate mode', async () => {
    mockCreateMutate.mockImplementation((body, { onSuccess }) => {
      onSuccess({ id: 'pers-456', name: body.name, data: body.data } as Persona);
    });

    await render(
      withSafeArea(
        <CreatePersonaSheet
          open={true}
          onOpenChange={jest.fn()}
          profile={mockProfile}
        />
      )
    );

    await fireEvent.changeText(screen.getByLabelText('Persona name'), 'Blank Profile');
    await fireEvent.press(screen.getByLabelText('Start blank'));
    await fireEvent.press(screen.getByLabelText('Create persona'));

    expect(mockCreateMutate).toHaveBeenCalledWith(
      expect.objectContaining({
        name: 'Blank Profile',
        data: expect.objectContaining({
          summary: '',
        }),
      }),
      expect.any(Object)
    );
  });
});
