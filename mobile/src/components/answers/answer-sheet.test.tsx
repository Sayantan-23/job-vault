import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react-native';
import type { ReactNode } from 'react';

import type { Answer } from '@/types/answer';
import { withSafeArea } from '@/components/ui/test-safe-area';
import { AnswerSheet } from './answer-sheet';

const mockAnswer: Answer = {
  id: 'a-1',
  createdAt: '2026-09-01T00:00:00Z',
  updatedAt: '2026-09-01T00:00:00Z',
  userId: 'u1',
  question: 'What is your biggest weakness?',
  answerShort: 'Impatience with slow CI.',
  answerLong: 'I tend to want quick feedback loops and optimize build times.',
  lastUsedAt: null,
};

const mockPersonas = [
  { id: 'p-1', name: 'Software Architect', createdAt: '', updatedAt: '', userId: '' },
];

function makeWrapper() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return withSafeArea(<QueryClientProvider client={client}>{children}</QueryClientProvider>);
  };
}

jest.mock('@/lib/api-client', () => ({
  __esModule: true,
  apiClient: {
    post: jest.fn().mockResolvedValue({ id: 'a-2' }),
    patch: jest.fn().mockResolvedValue({ id: 'a-1' }),
  },
  ApiError: class ApiError extends Error {},
}));

describe('AnswerSheet', () => {
  it('renders "New answer" title and empty inputs for create mode', async () => {
    await render(
      <AnswerSheet
        open={true}
        onOpenChange={jest.fn()}
        answer={null}
        personas={mockPersonas}
        aiEnabled={true}
      />,
      { wrapper: makeWrapper() }
    );

    expect(screen.getByText('New answer')).toBeTruthy();
    expect(screen.getByLabelText('Question').props.value).toBe('');
  });

  it('renders "Edit answer" and populates existing answer fields', async () => {
    await render(
      <AnswerSheet
        open={true}
        onOpenChange={jest.fn()}
        answer={mockAnswer}
        personas={mockPersonas}
        aiEnabled={true}
      />,
      { wrapper: makeWrapper() }
    );

    expect(screen.getByText('Edit answer')).toBeTruthy();
    expect(screen.getByLabelText('Question').props.value).toBe(
      'What is your biggest weakness?'
    );
    expect(screen.getByLabelText('Short Answer').props.value).toBe(
      'Impatience with slow CI.'
    );
  });
});
